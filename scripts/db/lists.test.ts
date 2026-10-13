import { LISTS_PER_MEMBER_MAX, LIST_ITEMS_MAX } from "@espressoir/core";
import { listRowSchema } from "@espressoir/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

let db: TestDb;
let ada: string;
let bob: string;
let admin: string;
let coffees: string[];

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.begin();
  ada = await createUser(db, { username: "ada_test" });
  bob = await createUser(db, { username: "bob_test" });
  admin = await createUser(db, { username: "admin_test", role: "admin" });
  const [brand] = await db.sql<{ id: string }>(
    "insert into public.brands (name) values ('Liste Kavurucu') returning id",
  );
  coffees = (
    await db.sql<{ id: string }>(
      `insert into public.coffees (brand_id, name)
       select $1, 'Kahve ' || n from generate_series(1, 4) as n returning id`,
      [brand!.id],
    )
  ).map((row) => row.id);
});
afterEach(async () => {
  await db.rollback();
});

async function createList(
  user: string,
  title: string,
  options: { isPublic?: boolean; description?: string | null } = {},
): Promise<{ id: string; slug: string }> {
  const [row] = await db.as(user).sql<{ id: string; slug: string }>(
    `insert into public.lists (user_id, title, description, is_public)
     values ($1, $2, $3, $4) returning id, slug`,
    [user, title, options.description ?? null, options.isPublic ?? true],
  );
  return row!;
}

const add = (user: string | null, listId: string, coffeeId: string, note: string | null = null) =>
  db
    .as(user)
    .sql("insert into public.list_items (list_id, coffee_id, note) values ($1, $2, $3)", [
      listId,
      coffeeId,
      note,
    ]);

/** The list as the API would serve it to `as` (JSON, so dates arrive as text). */
const feed = async (as: string | null, listId: string) => {
  const [found] = await db
    .as(as)
    .sql<{ row: unknown }>("select to_jsonb(f) as row from public.list_feed f where list_id = $1", [
      listId,
    ]);
  return found ? listRowSchema.parse(found.row) : undefined;
};

describe("lists", () => {
  it("get an address from their title that survives a rename", async () => {
    const list = await createList(ada, "  En sevdiğim   espressolar ", { description: "  " });
    expect(list.slug).toBe("en-sevdigim-espressolar");

    await db
      .as(ada)
      .sql("update public.lists set title = 'Sabah kahveleri' where id = $1", [list.id]);
    expect(await feed(null, list.id)).toMatchObject({
      title: "Sabah kahveleri",
      slug: "en-sevdigim-espressolar",
      description: null,
      owner: { username: "ada_test" },
      items: [],
    });
  });

  it("number a repeated title, per member", async () => {
    expect((await createList(ada, "Favoriler")).slug).toBe("favoriler");
    expect((await createList(ada, "favoriler")).slug).toBe("favoriler-2");
    expect((await createList(ada, "Favoriler!")).slug).toBe("favoriler-3");
    expect((await createList(bob, "Favoriler")).slug).toBe("favoriler");
    // A title with nothing a slug can keep still gets an address.
    expect((await createList(ada, "☕☕")).slug).toBe("liste");
  });

  it("are written by their owner only, within the limits", async () => {
    await expect(createList(ada, "   ")).rejects.toThrow(/lists_title_length/);
    await expect(createList(ada, "x".repeat(81))).rejects.toThrow(/lists_title_length/);
    await expect(
      db
        .as(bob)
        .sql("insert into public.lists (user_id, title) values ($1, 'Başkası adına')", [ada]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.as(null).sql("insert into public.lists (user_id, title) values ($1, 'Ziyaretçi')", [ada]),
    ).rejects.toThrow(/permission denied/);

    const list = await createList(ada, "Benim");
    // The slug, the owner and the admin columns are not a member's to set.
    await expect(
      db.as(ada).sql("update public.lists set slug = 'baska' where id = $1", [list.id]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as(ada).sql("update public.lists set hidden_at = null where id = $1", [list.id]),
    ).rejects.toThrow(/permission denied/);
    await db
      .as(bob)
      .sql("update public.lists set title = 'Ele geçirildi' where id = $1", [list.id]);
    await db.as(bob).sql("delete from public.lists where id = $1", [list.id]);
    expect(await feed(null, list.id)).toMatchObject({ title: "Benim" });
  });

  it("are limited per member and per day", async () => {
    // Ten a day for a member…
    for (let n = 1; n <= 10; n += 1) await createList(ada, `Liste ${n}`);
    await expect(createList(ada, "On birinci")).rejects.toThrow(/rate_limited/);
    // …and never more than the cap, however slowly they are made.
    await db.sql(
      `insert into public.lists (user_id, title, created_at)
       select $1, 'Eski ' || n, now() - interval '30 days'
       from generate_series(1, $2::int) as n`,
      [bob, LISTS_PER_MEMBER_MAX],
    );
    await expect(createList(bob, "Bir fazlası")).rejects.toThrow(/too_many_lists/);
  });

  it("stay with their owner when private, and can be deleted while restricted", async () => {
    const list = await createList(ada, "Kendime notlar", { isPublic: false });
    await add(ada, list.id, coffees[0]!);
    expect(await feed(ada, list.id)).toMatchObject({ isPublic: false });
    expect(await feed(bob, list.id)).toBeUndefined();
    expect(await feed(null, list.id)).toBeUndefined();
    expect(
      await db.as(bob).sql("select 1 from public.list_items where list_id = $1", [list.id]),
    ).toEqual([]);

    await db.sql(
      `insert into public.profile_private (profile_id, restricted_until)
       values ($1, now() + interval '1 day')
       on conflict (profile_id) do update set restricted_until = excluded.restricted_until`,
      [ada],
    );
    await expect(createList(ada, "Kısıtlıyken")).rejects.toThrow(/row-level security/);
    await expect(add(ada, list.id, coffees[1]!)).rejects.toThrow(/row-level security/);
    await db.as(ada).sql("delete from public.lists where id = $1", [list.id]);
    expect(await feed(ada, list.id)).toBeUndefined();
  });
});

describe("list entries", () => {
  it("keep the order they were added in, with tidy notes", async () => {
    const list = await createList(ada, "Sıralı");
    await add(ada, list.id, coffees[2]!, "  Sütle harika.  ");
    await add(ada, list.id, coffees[0]!, "   ");
    await add(ada, list.id, coffees[1]!);
    expect((await feed(null, list.id))!.items).toEqual([
      { coffeeId: coffees[2], note: "Sütle harika." },
      { coffeeId: coffees[0], note: null },
      { coffeeId: coffees[1], note: null },
    ]);

    await expect(add(ada, list.id, coffees[0]!)).rejects.toThrow(/list_items_pkey/);
    await expect(add(ada, list.id, coffees[3]!, "x".repeat(281))).rejects.toThrow(
      /list_items_note_length/,
    );
    await expect(add(bob, list.id, coffees[3]!)).rejects.toThrow(/row-level security/);
    await expect(
      db.as(ada).sql("update public.list_items set position = 9 where list_id = $1", [list.id]),
    ).rejects.toThrow(/permission denied/);
  });

  it("are reordered as a whole by the owner", async () => {
    const list = await createList(ada, "Yeniden sıralı");
    for (const coffee of coffees.slice(0, 3)) await add(ada, list.id, coffee);
    const reorder = (user: string | null, ids: string[]) =>
      db.as(user).sql("select public.reorder_list_v1($1, $2::uuid[])", [list.id, ids]);

    await reorder(ada, [coffees[2]!, coffees[0]!, coffees[1]!]);
    expect((await feed(null, list.id))!.items.map((item) => item.coffeeId)).toEqual([
      coffees[2],
      coffees[0],
      coffees[1],
    ]);

    // Nothing may be added, dropped or named twice.
    await expect(reorder(ada, [coffees[0]!, coffees[1]!])).rejects.toThrow(/list_order_mismatch/);
    await expect(reorder(ada, [coffees[0]!, coffees[1]!, coffees[3]!])).rejects.toThrow(
      /list_order_mismatch/,
    );
    await expect(reorder(ada, [coffees[0]!, coffees[0]!, coffees[1]!])).rejects.toThrow(
      /list_order_mismatch/,
    );
    await expect(reorder(bob, [coffees[0]!, coffees[1]!, coffees[2]!])).rejects.toThrow(
      /list_not_found/,
    );
    await expect(reorder(null, [coffees[0]!])).rejects.toThrow(/permission denied/);
  });

  it("stop at the cap, and make their list as recent as its last change", async () => {
    const list = await createList(ada, "Dolu");
    const [brand] = await db.sql<{ id: string }>("select id from public.brands limit 1");
    await db.sql(
      `with made as (
         insert into public.coffees (brand_id, name)
         select $1, 'Dolgu ' || n from generate_series(1, $2::int) as n returning id
       )
       insert into public.list_items (list_id, coffee_id) select $3, id from made`,
      [brand!.id, LIST_ITEMS_MAX, list.id],
    );
    await expect(add(ada, list.id, coffees[0]!)).rejects.toThrow(/list_full/);

    await db.sql("update public.lists set updated_at = now() - interval '1 day' where id = $1", [
      list.id,
    ]);
    await db
      .as(ada)
      .sql("delete from public.list_items where list_id = $1 and position = 1", [list.id]);
    const [row] = await db.sql<{ fresh: boolean }>(
      "select updated_at > now() - interval '1 hour' as fresh from public.lists where id = $1",
      [list.id],
    );
    expect(row!.fresh).toBe(true);
  });

  it("move to the surviving coffee when two coffees are merged", async () => {
    const both = await createList(ada, "İkisi de");
    await add(ada, both.id, coffees[0]!, "kalan");
    await add(ada, both.id, coffees[1]!, "kopya");
    const one = await createList(bob, "Yalnız kopya");
    await add(bob, one.id, coffees[1]!, "taşınacak");

    await db
      .as(admin)
      .sql("select public.admin_merge_coffees_v1($1, $2)", [coffees[1], coffees[0]]);
    expect((await feed(null, both.id))!.items).toEqual([{ coffeeId: coffees[0], note: "kalan" }]);
    expect((await feed(null, one.id))!.items).toEqual([
      { coffeeId: coffees[0], note: "taşınacak" },
    ]);
  });
});

describe("moderating lists", () => {
  it("lets a member report a list and an admin hide or delete it", async () => {
    const list = await createList(ada, "Şikâyetlik");
    await db
      .as(bob)
      .sql(
        "insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'list', $2, 'spam')",
        [bob, list.id],
      );
    await expect(
      db
        .as(bob)
        .sql(
          "insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'list', $2, 'spam')",
          [bob, bob],
        ),
    ).rejects.toThrow(/report_target_not_found/);

    await expect(
      db.as(bob).sql("select public.admin_set_hidden_v1('list', $1, true, 'neden')", [list.id]),
    ).rejects.toThrow(/not_allowed/);
    await db
      .as(admin)
      .sql("select public.admin_set_hidden_v1('list', $1, true, 'neden')", [list.id]);
    // Hidden: gone for everyone but its owner, who sees it marked.
    expect(await feed(bob, list.id)).toBeUndefined();
    expect(await feed(null, list.id)).toBeUndefined();
    expect(await feed(ada, list.id)).toMatchObject({ isHidden: true });

    await db.as(admin).sql("select public.admin_set_hidden_v1('list', $1, false)", [list.id]);
    expect(await feed(null, list.id)).toMatchObject({ isHidden: false });

    await db.as(admin).sql("select public.admin_delete_v1('list', $1, 'spam')", [list.id]);
    expect(await feed(ada, list.id)).toBeUndefined();
    const log = await db.sql<{ action: string }>(
      "select action from public.moderation_log where target_type = 'list' order by created_at, action",
    );
    expect(log.map((row) => row.action).sort()).toEqual(["delete", "hide", "unhide"]);
  });

  it("goes with its owner's account, and into their data export", async () => {
    const list = await createList(ada, "Dışa aktarılacak", { description: "Açıklama" });
    await add(ada, list.id, coffees[0]!, "not");
    const [row] = await db
      .as(ada)
      .sql<{ doc: { lists: unknown[] } }>("select public.export_my_data_v2() as doc");
    expect(row!.doc.lists).toMatchObject([
      {
        title: "Dışa aktarılacak",
        description: "Açıklama",
        public: true,
        coffees: [{ brand: "Liste Kavurucu", coffee: "Kahve 1", note: "not" }],
      },
    ]);

    await db.as(ada).sql("select public.delete_my_account_v1()");
    const left = await db.sql("select 1 from public.lists where id = $1", [list.id]);
    expect(left).toEqual([]);
  });
});
