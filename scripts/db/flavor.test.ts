import { FLAVOR_TAGS_MAX } from "@espressoir/core";
import { parseArchive } from "@espressoir/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

let db: TestDb;
let ada: string;
let bob: string;

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
});
afterEach(async () => {
  await db.rollback();
});

const slugs = (list: readonly string[]) =>
  `array[${list.map((slug) => `'${slug}'`).join(",")}]::text[]`;

/** Logs a tasting of a new coffee as `user`, with tags, and returns its id. */
async function log(user: string, tags: readonly string[] | null, extra = ""): Promise<string> {
  const [row] = await db.as(user).sql<{ tasting_id: string }>(
    `select tasting_id from public.log_tasting_v2(
       p_brand_name => 'Test Kavurucu', p_coffee_name => 'Deneme ' || gen_random_uuid(),
       p_score => 7::smallint, p_tasted_at => '2026-10-01'${extra},
       p_flavor_tag_slugs => ${tags ? slugs(tags) : "null"})`,
  );
  return row!.tasting_id;
}

const tagsOf = async (tastingId: string, as: string | null = null) => {
  const [row] = await db
    .as(as)
    .sql<{ flavor_tag_slugs: string[] }>(
      "select flavor_tag_slugs from public.tasting_feed where tasting_id = $1",
      [tastingId],
    );
  return row?.flavor_tag_slugs;
};

const setTags = (user: string | null, tastingId: string, tags: readonly string[]) =>
  db.as(user).sql("select public.set_tasting_tags_v1($1, " + slugs(tags) + ")", [tastingId]);

describe("log_tasting_v2", () => {
  it("records a tasting with its tags, listed in the order of the reference list", async () => {
    const id = await log(ada, ["vanilya", "Kakao ", "meyvemsi", "kakao"]);
    expect(await tagsOf(id)).toEqual(["meyvemsi", "kakao", "vanilya"]);
  });

  it("works without tags, like v1", async () => {
    expect(await tagsOf(await log(ada, null))).toEqual([]);
    expect(await tagsOf(await log(ada, []))).toEqual([]);
  });

  it("undoes the tasting when a tag is refused", async () => {
    const count = async () =>
      (await db.sql<{ n: number }>("select count(*)::int as n from public.tastings"))[0]!.n;
    const before = await count();
    await expect(log(ada, ["boyle-bir-tat-yok"])).rejects.toThrow(/flavor_tag_not_found/);
    await expect(
      log(ada, ["meyvemsi", "narenciye", "kakao", "findik", "bal", "vanilya"]),
    ).rejects.toThrow(/too_many_flavor_tags/);
    expect(await count()).toBe(before);
  });

  it("keeps tags off a wishlist entry", async () => {
    await expect(
      db.as(ada).sql(
        `select * from public.log_tasting_v2(
           p_brand_name => 'Test Kavurucu', p_coffee_name => 'Sonra denenecek',
           p_status => 'wishlist', p_flavor_tag_slugs => ${slugs(["kakao"])})`,
      ),
    ).rejects.toThrow(/wishlist_has_no_tags/);
  });

  it("is not for visitors", async () => {
    await expect(
      db.as(null).sql(
        `select * from public.log_tasting_v2(p_brand_name => 'X', p_coffee_name => 'Y',
           p_flavor_tag_slugs => ${slugs(["kakao"])})`,
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("set_tasting_tags_v1", () => {
  it("replaces the whole set", async () => {
    const id = await log(ada, ["kakao", "findik"]);
    await setTags(ada, id, ["findik", "bal", "karamel"]);
    expect(await tagsOf(id)).toEqual(["findik", "karamel", "bal"]);
    await setTags(ada, id, []);
    expect(await tagsOf(id)).toEqual([]);
  });

  it(`accepts ${FLAVOR_TAGS_MAX} tags, again and again, and no more`, async () => {
    const five = ["meyvemsi", "narenciye", "kakao", "findik", "bal"];
    const id = await log(ada, five);
    // Saving an unchanged form must not trip over the cap.
    await setTags(ada, id, five);
    expect(await tagsOf(id)).toHaveLength(FLAVOR_TAGS_MAX);
    await expect(setTags(ada, id, [...five, "vanilya"])).rejects.toThrow(/too_many_flavor_tags/);
    await expect(
      db.as(ada).sql(
        `insert into public.tasting_flavor_tags (tasting_id, flavor_tag_id)
         select $1, id from public.flavor_tags where slug = 'vanilya'`,
        [id],
      ),
    ).rejects.toThrow(/too_many_flavor_tags/);
  });

  it("only touches the caller's own tastings", async () => {
    const id = await log(ada, ["kakao"]);
    await expect(setTags(bob, id, ["bal"])).rejects.toThrow(/tasting_not_found/);
    await expect(setTags(null, id, ["bal"])).rejects.toThrow(/permission denied/);
    await expect(
      db.as(bob).sql(
        `insert into public.tasting_flavor_tags (tasting_id, flavor_tag_id)
         select $1, id from public.flavor_tags where slug = 'bal'`,
        [id],
      ),
    ).rejects.toThrow(/row-level security/);
    await db.as(bob).sql("delete from public.tasting_flavor_tags where tasting_id = $1", [id]);
    expect(await tagsOf(id)).toEqual(["kakao"]);
  });

  it("lets a restricted member remove tags but not add any", async () => {
    const id = await log(ada, ["kakao", "bal"]);
    await db.sql(
      `insert into public.profile_private (profile_id, restricted_until)
       values ($1, now() + interval '1 day')
       on conflict (profile_id) do update set restricted_until = excluded.restricted_until`,
      [ada],
    );
    await setTags(ada, id, ["kakao"]);
    expect(await tagsOf(id)).toEqual(["kakao"]);
    await expect(setTags(ada, id, ["kakao", "vanilya"])).rejects.toThrow(/row-level security/);
  });

  it("drops the tags of a tasting that goes back to the wishlist", async () => {
    const id = await log(ada, ["kakao", "bal"]);
    await db
      .as(ada)
      .sql(
        "update public.tastings set status = 'wishlist', score = null, tasted_at = null where id = $1",
        [id],
      );
    expect(await tagsOf(id, ada)).toEqual([]);
    await expect(setTags(ada, id, ["kakao"])).rejects.toThrow(/wishlist_has_no_tags/);
  });
});

describe("reading tags", () => {
  it("shows them to whoever may see the tasting, and to nobody else", async () => {
    const open = await log(ada, ["kakao"]);
    const closed = await log(ada, ["bal"], ", p_visibility => 'private'");
    expect(await tagsOf(open, bob)).toEqual(["kakao"]);
    expect(await tagsOf(closed, bob)).toBeUndefined();
    expect(await tagsOf(closed, ada)).toEqual(["bal"]);
    const leaked = await db
      .as(bob)
      .sql("select 1 from public.tasting_flavor_tags where tasting_id = $1", [closed]);
    expect(leaked).toEqual([]);
  });

  it("reaches the archive: tags on tastings and the reference list", async () => {
    const id = await log(ada, ["yasemin", "kakao"]);
    // Read as a visitor would through the API, inside the test transaction.
    const json = async (query: string) =>
      (
        await db
          .as(null)
          .sql<{ rows: unknown[] }>(
            `select coalesce(json_agg(r), '[]'::json) as rows from (${query}) as r`,
          )
      )[0]!.rows;
    const archive = parseArchive({
      coffees: await json("select * from public.coffee_overview"),
      tastings: await json("select * from public.tasting_feed"),
      brewMethods: await json("select * from public.brew_methods"),
      flavorTags: await json("select * from public.flavor_tags order by sort_order"),
    });
    expect(archive.tastings.find((tasting) => tasting.id === id)?.tags).toEqual([
      { slug: "yasemin", name: "Yasemin" },
      { slug: "kakao", name: "Kakao" },
    ]);
    expect(archive.flavorTags).toHaveLength(20);
    expect(archive.flavorTags[0]).toEqual({
      slug: "meyvemsi",
      name: "Meyvemsi",
      group: "fruity",
      sortOrder: 10,
    });
  });

  it("goes into the member's data export", async () => {
    const id = await log(ada, ["kakao", "bal"]);
    await log(bob, ["vanilya"]);
    const [row] = await db
      .as(ada)
      .sql<{ doc: { tasting_flavor_tags: unknown } }>("select public.export_my_data_v2() as doc");
    expect(row!.doc.tasting_flavor_tags).toEqual([{ tasting_id: id, tags: ["Kakao", "Bal"] }]);
  });
});
