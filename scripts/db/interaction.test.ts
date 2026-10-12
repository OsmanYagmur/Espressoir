/**
 * Comments, likes, reports and moderation: who may read, write, hide and remove what.
 * Same harness as rls.test.ts: every check runs as the role the API would use.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

let db: TestDb;
let owner: string; // admin
let ada: string; // author of the tasting under discussion
let bob: string; // another member
let newcomer: string; // has not finished onboarding
let coffeeId: string;
let tastingId: string; // ada's, public

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  await db.begin();
  owner = await createUser(db, { username: "owner_test", role: "admin" });
  ada = await createUser(db, { username: "ada_test" });
  bob = await createUser(db, { username: "bob_test" });
  newcomer = await createUser(db, { username: "yeni_test", onboarded: false });
  const [brand] = await db.sql<{ id: string }>(
    "insert into public.brands (name) values ('Test Kavurucu') returning id",
  );
  const [coffee] = await db.sql<{ id: string }>(
    "insert into public.coffees (brand_id, name) values ($1, 'Test Harman') returning id",
    [brand!.id],
  );
  coffeeId = coffee!.id;
  tastingId = await addTasting(ada, { score: 8 });
});
afterEach(async () => {
  await db.rollback();
});

async function addTasting(userId: string, fields: Record<string, unknown> = {}): Promise<string> {
  const row = { user_id: userId, coffee_id: coffeeId, ...fields };
  const columns = Object.keys(row);
  const [inserted] = await db.sql<{ id: string }>(
    `insert into public.tastings (${columns.join(", ")})
     values (${columns.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    Object.values(row),
  );
  return inserted!.id;
}

/** Writes a comment the way the API does: as the member, with only the allowed columns. */
async function comment(
  userId: string,
  body: string,
  options: { on?: string; replyTo?: string } = {},
): Promise<string> {
  const [row] = await db
    .as(userId)
    .sql<{ id: string }>(
      "insert into public.comments (tasting_id, user_id, parent_id, body) values ($1, $2, $3, $4) returning id",
      [options.on ?? tastingId, userId, options.replyTo ?? null, body],
    );
  return row!.id;
}

// Sorted by text, removed comments (null) first: inside a test every row carries the same
// timestamp (the transaction's), so insertion order cannot be read back.
const bodies = async (as: string | null) =>
  (
    await db
      .as(as)
      .sql<{ body: string | null }>("select body from public.comments order by body nulls first")
  ).map((row) => row.body);

describe("comments: who can read", () => {
  it("follows the tasting: public for everyone, private for nobody else", async () => {
    await comment(bob, "Katılıyorum.");
    expect(await bodies(null)).toEqual(["Katılıyorum."]);

    await db.sql("update public.tastings set visibility = 'private' where id = $1", [tastingId]);
    expect(await bodies(null)).toEqual([]);
    expect(await bodies(bob)).toEqual([]);
    expect(await bodies(ada)).toEqual(["Katılıyorum."]);
  });
});

describe("comments: who can write", () => {
  it("lets a member comment as themselves, trimmed, on a tasting they can see", async () => {
    await comment(bob, "  Bence de güzel.  ");
    expect(await bodies(null)).toEqual(["Bence de güzel."]);

    await expect(
      db
        .as(bob)
        .sql("insert into public.comments (tasting_id, user_id, body) values ($1, $2, 'sahte')", [
          tastingId,
          ada,
        ]),
    ).rejects.toThrow(/row-level security/);

    const hiddenAway = await addTasting(ada, { visibility: "private" });
    await expect(comment(bob, "Göremediğim tadım", { on: hiddenAway })).rejects.toThrow(
      /row-level security/,
    );
  });

  it("refuses visitors, newcomers and empty comments", async () => {
    await expect(
      db
        .as(null)
        .sql("insert into public.comments (tasting_id, body) values ($1, 'x')", [tastingId]),
    ).rejects.toThrow(/permission denied/);
    await expect(comment(newcomer, "Erken")).rejects.toThrow(/row-level security/);
    await expect(comment(bob, "   ")).rejects.toThrow(/comments_body_length/);
    await expect(comment(bob, "x".repeat(2001))).rejects.toThrow(/comments_body_length/);
  });

  it("does not let a member choose a comment's dates or state", async () => {
    for (const column of ["created_at", "edited_at", "deleted_at", "hidden_at"]) {
      await expect(
        db
          .as(bob)
          .sql(
            `insert into public.comments (tasting_id, user_id, body, ${column}) values ($1, $2, 'x', now())`,
            [tastingId, bob],
          ),
      ).rejects.toThrow(/permission denied/);
    }
  });

  it("allows one level of replies, under a comment of the same tasting", async () => {
    const top = await comment(bob, "İlk yorum");
    const reply = await comment(ada, "Yanıt", { replyTo: top });
    await expect(comment(bob, "Yanıtın yanıtı", { replyTo: reply })).rejects.toThrow(
      /comment_reply_too_deep/,
    );

    const other = await addTasting(bob);
    await expect(comment(ada, "Yanlış yer", { on: other, replyTo: top })).rejects.toThrow(
      /comment_parent_invalid/,
    );
  });

  it("lets the author edit the words, marks the edit, and nobody else can", async () => {
    const id = await comment(bob, "ilk hali");
    const [edited] = await db
      .as(bob)
      .sql<{ body: string; edited: boolean }>(
        "update public.comments set body = ' son hali ' where id = $1 returning body, edited_at is not null as edited",
        [id],
      );
    expect(edited).toEqual({ body: "son hali", edited: true });

    expect(
      await db
        .as(ada)
        .sql("update public.comments set body = 'x' where id = $1 returning id", [id]),
    ).toHaveLength(0);
    await expect(
      db.as(bob).sql("update public.comments set hidden_at = null where id = $1", [id]),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("comments: removal", () => {
  const remove = (as: string | null, id: string) =>
    db.as(as).sql<{ result: string }>("select public.delete_comment_v1($1) as result", [id]);

  it("cannot be done with a plain delete", async () => {
    const id = await comment(bob, "Silinemez");
    await expect(db.as(bob).sql("delete from public.comments where id = $1", [id])).rejects.toThrow(
      /permission denied/,
    );
  });

  it("deletes an unanswered comment and blanks an answered one", async () => {
    const lonely = await comment(bob, "Yanıtsız");
    const answered = await comment(bob, "Yanıtlanan");
    await comment(ada, "Ada'nın yanıtı", { replyTo: answered });

    expect(await remove(bob, lonely)).toEqual([{ result: "deleted" }]);
    expect(await remove(bob, answered)).toEqual([{ result: "blanked" }]);

    const rows = await db.sql(
      "select body, user_id, deleted_at is not null as deleted from public.comments order by body nulls first",
    );
    // The placeholder keeps its place so the reply still hangs from something.
    expect(rows).toEqual([
      { body: null, user_id: null, deleted: true },
      { body: "Ada'nın yanıtı", user_id: ada, deleted: false },
    ]);
    // Nothing can be written back into a removed comment, and nobody can reply to it.
    await expect(comment(ada, "Geç kaldım", { replyTo: answered })).rejects.toThrow(
      /comment_parent_gone/,
    );
  });

  it("is for the author and admins only", async () => {
    const id = await comment(bob, "Bob'un yorumu");
    await expect(remove(ada, id)).rejects.toThrow(/not_allowed/);
    await expect(remove(null, id)).rejects.toThrow(/permission denied/);
    expect(await remove(owner, id)).toEqual([{ result: "deleted" }]);
  });

  it("happens to all of a member's comments when their account goes", async () => {
    const answered = await comment(bob, "Bob'un yanıtlanan yorumu");
    await comment(ada, "Ada'nın yanıtı", { replyTo: answered });
    await comment(bob, "Bob'un yanıtsız yorumu");
    const adas = await comment(ada, "Ada'nın yorumu");
    await comment(bob, "Bob'un yanıtı", { replyTo: adas });
    await db
      .as(bob)
      .sql("insert into public.likes (user_id, tasting_id) values ($1, $2)", [bob, tastingId]);

    await db.as(bob).sql("select public.delete_my_account_v1()");

    expect(await bodies(null)).toEqual([null, "Ada'nın yanıtı", "Ada'nın yorumu"]);
    expect(await db.sql("select 1 from public.likes")).toEqual([]);
  });
});

describe("likes", () => {
  const like = (userId: string, target = tastingId) =>
    db
      .as(userId)
      .sql("insert into public.likes (user_id, tasting_id) values ($1, $2)", [userId, target]);

  it("go to other people's tastings, once, as yourself", async () => {
    await like(bob);
    await expect(like(bob)).rejects.toThrow(/likes_pkey/);
    await expect(like(ada)).rejects.toThrow(/row-level security/); // her own tasting
    await expect(
      db
        .as(bob)
        .sql("insert into public.likes (user_id, tasting_id) values ($1, $2)", [owner, tastingId]),
    ).rejects.toThrow(/row-level security/);
    await expect(like(newcomer)).rejects.toThrow(/row-level security/);
    await expect(
      db.as(null).sql("insert into public.likes (tasting_id) values ($1)", [tastingId]),
    ).rejects.toThrow(/permission denied/);
  });

  it("are public, and only the person who liked can take a like back", async () => {
    await like(bob);
    expect(await db.as(null).sql("select user_id from public.likes")).toEqual([{ user_id: bob }]);
    expect(await db.as(ada).sql("delete from public.likes returning user_id")).toHaveLength(0);
    expect(await db.as(bob).sql("delete from public.likes returning user_id")).toHaveLength(1);
  });

  it("and comments are counted on the feed row, without what was removed or hidden", async () => {
    await like(bob);
    await like(owner);
    const kept = await comment(bob, "Kalan yorum");
    await comment(ada, "Yanıt", { replyTo: kept });
    const hidden = await comment(bob, "Gizlenecek");
    const gone = await comment(owner, "Silinecek");
    await db.as(owner).sql("select public.delete_comment_v1($1)", [gone]);
    await db
      .as(owner)
      .sql("select public.admin_set_hidden_v1('comment', $1, true, 'test')", [hidden]);

    const counts = (as: string | null) =>
      db
        .as(as)
        .sql("select like_count, comment_count from public.tasting_feed where tasting_id = $1", [
          tastingId,
        ]);
    expect(await counts(null)).toEqual([{ like_count: 2, comment_count: 2 }]);
    // The same for the author of the hidden comment: counts do not depend on the viewer.
    expect(await counts(bob)).toEqual([{ like_count: 2, comment_count: 2 }]);
  });
});

describe("rate limits", () => {
  it("stop the 11th comment within five minutes", async () => {
    for (let i = 1; i <= 10; i++) await comment(bob, `Yorum ${i}`);
    await expect(comment(bob, "Yorum 11")).rejects.toThrow(/rate_limited/);
    await expect(comment(ada, "Başkası yazabilir")).resolves.toBeTruthy();
  });

  it("cannot be dodged by back-dating a row", async () => {
    const [row] = await db.as(bob).sql<{ fresh: boolean }>(
      `insert into public.tastings (user_id, coffee_id, created_at) values ($1, $2, '2001-01-01')
         returning created_at > now() - interval '1 minute' as fresh`,
      [bob, coffeeId],
    );
    expect(row).toEqual({ fresh: true });
    // Scripts keep the dates they bring (the import does).
    const [imported] = await db.sql<{ year: number }>(
      `insert into public.tastings (user_id, coffee_id, created_at) values ($1, $2, '2001-01-01')
       returning extract(year from created_at)::int as year`,
      [bob, coffeeId],
    );
    expect(imported).toEqual({ year: 2001 });
  });
});

describe("hiding", () => {
  const hide = (as: string | null, type: string, id: string, hidden = true) =>
    db
      .as(as)
      .sql("select public.admin_set_hidden_v1($1::public.report_target, $2, $3, $4)", [
        type,
        id,
        hidden,
        hidden ? "Kurallara aykırı" : null,
      ]);
  const visibleTastings = async (as: string | null) =>
    (await db.as(as).sql("select id from public.tastings")).length;

  it("takes a tasting away from everyone but its author and admins", async () => {
    await db.sql("insert into public.follows (follower_id, following_id) values ($1, $2)", [
      bob,
      ada,
    ]);
    await hide(owner, "tasting", tastingId);

    expect(await visibleTastings(null)).toBe(0);
    expect(await visibleTastings(bob)).toBe(0);
    expect(await visibleTastings(owner)).toBe(1);
    const own = await db
      .as(ada)
      .sql("select is_hidden from public.tasting_feed where tasting_id = $1", [tastingId]);
    expect(own).toEqual([{ is_hidden: true }]);
  });

  it("takes a hidden tasting out of every number, and brings it back when shown again", async () => {
    const numbers = async () => {
      const [coffee] = await db
        .as(ada)
        .sql("select tasting_count, avg_score from public.coffee_stats where coffee_id = $1", [
          coffeeId,
        ]);
      const [profile] = await db
        .as(ada)
        .sql("select tasting_count from public.profile_overview where user_id = $1", [ada]);
      return [Number(coffee!.tasting_count), coffee!.avg_score, Number(profile!.tasting_count)];
    };
    expect((await numbers())[0]).toBe(1);

    await hide(owner, "tasting", tastingId);
    // Even for the author, who can still see the tasting itself.
    expect(await numbers()).toEqual([0, null, 0]);

    await hide(owner, "tasting", tastingId, false);
    expect((await numbers())[0]).toBe(1);
    expect(await visibleTastings(null)).toBe(1);
  });

  it("shows a hidden comment to its author and admins only", async () => {
    const id = await comment(bob, "Gizlenecek yorum");
    await hide(owner, "comment", id);
    expect(await bodies(null)).toEqual([]);
    expect(await bodies(ada)).toEqual([]);
    expect(await bodies(bob)).toEqual(["Gizlenecek yorum"]);
    expect(await bodies(owner)).toEqual(["Gizlenecek yorum"]);
  });

  it("is for admins: members cannot hide, and cannot set the columns themselves", async () => {
    await expect(hide(bob, "tasting", tastingId)).rejects.toThrow(/not_allowed/);
    await expect(hide(null, "tasting", tastingId)).rejects.toThrow(/permission denied/);
    await expect(
      db.as(ada).sql("update public.tastings set hidden_at = null where id = $1", [tastingId]),
    ).rejects.toThrow(/permission denied/);
    await expect(hide(owner, "profile", ada)).rejects.toThrow(/target_cannot_be_hidden/);
  });
});

describe("reports", () => {
  const report = (as: string | null, type: string, id: string, reason = "spam") =>
    db.as(as).sql(
      `insert into public.reports (reporter_id, target_type, target_id, reason, details)
       values ($1, $2::public.report_target, $3, $4::public.report_reason, '  Açıklama  ')`,
      [as, type, id, reason],
    );

  it("can be filed once per thing, about something that exists", async () => {
    await report(bob, "tasting", tastingId);
    await expect(report(bob, "tasting", tastingId, "abuse")).rejects.toThrow(
      /reports_once_per_target/,
    );
    await report(bob, "profile", ada);
    await report(bob, "coffee", coffeeId, "wrong_info");
    await expect(report(bob, "comment", tastingId)).rejects.toThrow(/report_target_not_found/);
    await expect(report(newcomer, "tasting", tastingId)).rejects.toThrow(/row-level security/);
    await expect(report(null, "tasting", tastingId)).rejects.toThrow(/permission denied/);
  });

  it("are read by the reporter and by admins, not by the person reported", async () => {
    await report(bob, "tasting", tastingId);
    const read = (as: string | null) => db.as(as).sql("select details, status from public.reports");
    expect(await read(bob)).toEqual([{ details: "Açıklama", status: "open" }]);
    expect(await read(owner)).toHaveLength(1);
    expect(await read(ada)).toEqual([]);
    await expect(read(null)).rejects.toThrow(/permission denied/);
  });

  it("are closed by an admin, and members cannot change them", async () => {
    await report(bob, "tasting", tastingId);
    const [{ id }] = (await db.sql<{ id: string }>("select id from public.reports")) as [
      { id: string },
    ];
    await expect(
      db.as(bob).sql("update public.reports set status = 'dismissed' where id = $1", [id]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as(bob).sql("select public.admin_resolve_report_v1($1, 'resolved', null)", [id]),
    ).rejects.toThrow(/not_allowed/);

    await db
      .as(owner)
      .sql("select public.admin_resolve_report_v1($1, 'resolved', 'Gizlendi')", [id]);
    const [closed] = await db.sql(
      "select status, resolved_by, resolution_note from public.reports where id = $1",
      [id],
    );
    expect(closed).toEqual({ status: "resolved", resolved_by: owner, resolution_note: "Gizlendi" });
  });
});

describe("restricting a member", () => {
  const restrict = (as: string, userId: string, days: number | null) =>
    db.as(as).sql("select public.admin_restrict_user_v1($1, $2, 'Spam')", [userId, days]);
  const canPost = async (userId: string) =>
    (await db.as(userId).sql<{ ok: boolean }>("select public.can_post() as ok"))[0]!.ok;

  it("stops them posting until it is lifted", async () => {
    await restrict(owner, bob, 7);
    expect(await canPost(bob)).toBe(false);
    await expect(comment(bob, "Kısıtlıyken")).rejects.toThrow(/row-level security/);
    // They are told why, and when it ends.
    const [state] = await db
      .as(bob)
      .sql(
        "select restricted_reason, restricted_until > now() as active from public.profile_private",
      );
    expect(state).toEqual({ restricted_reason: "Spam", active: true });

    await restrict(owner, bob, null);
    expect(await canPost(bob)).toBe(true);
  });

  it("is for admins, and never against one", async () => {
    await expect(restrict(bob, ada, 7)).rejects.toThrow(/not_allowed/);
    await expect(restrict(owner, owner, 7)).rejects.toThrow(/admin_cannot_be_restricted/);
    await expect(restrict(owner, bob, 0)).rejects.toThrow(/restriction_length_invalid/);
  });

  it("is written down, for admins to read", async () => {
    await restrict(owner, bob, 7);
    await db
      .as(owner)
      .sql("select public.admin_set_hidden_v1('tasting', $1, true, 'neden')", [tastingId]);
    const log = await db
      .as(owner)
      .sql(
        "select action, target_type, admin_id from public.moderation_log order by created_at, action",
      );
    expect(log).toEqual([
      { action: "hide", target_type: "tasting", admin_id: owner },
      { action: "restrict", target_type: "profile", admin_id: owner },
    ]);
    expect(await db.as(bob).sql("select 1 from public.moderation_log")).toEqual([]);
    // A refused attempt leaves no trace.
    await expect(restrict(bob, ada, 1)).rejects.toThrow(/not_allowed/);
    expect(await db.sql("select count(*)::int as n from public.moderation_log")).toEqual([
      { n: 2 },
    ]);
  });
});

describe("catalog upkeep", () => {
  async function memberCoffee(brandName: string, name: string): Promise<string> {
    const [brand] = await db.sql<{ id: string }>(
      "select coalesce(public.find_brand_id($1), (select id from public.brands limit 0)) as id",
      [brandName],
    );
    const brandId =
      brand?.id ??
      (
        await db.sql<{ id: string }>("insert into public.brands (name) values ($1) returning id", [
          brandName,
        ])
      )[0]!.id;
    const [coffee] = await db
      .as(bob)
      .sql<{ id: string }>(
        "insert into public.coffees (brand_id, name, created_by) values ($1, $2, $3) returning id",
        [brandId, name, bob],
      );
    return coffee!.id;
  }

  it("lets an admin mark a member's coffee as reviewed", async () => {
    const id = await memberCoffee("Test Kavurucu", "Üye Harmanı");
    await expect(db.as(bob).sql("select public.admin_review_coffee_v1($1)", [id])).rejects.toThrow(
      /not_allowed/,
    );
    await db.as(owner).sql("select public.admin_review_coffee_v1($1)", [id]);
    const [row] = await db.sql(
      "select reviewed_at is not null as reviewed, reviewed_by from public.coffees where id = $1",
      [id],
    );
    expect(row).toEqual({ reviewed: true, reviewed_by: owner });
  });

  it("merges a duplicate coffee into the original, tastings and all", async () => {
    const duplicate = await memberCoffee("Test Kavurucu", "Test Harmanı");
    await addTasting(bob, { coffee_id: duplicate, score: 6 });
    // Bob has both on his wishlist: one entry survives.
    await addTasting(bob, { coffee_id: duplicate, status: "wishlist" });
    await addTasting(bob, { status: "wishlist" });

    await expect(
      db.as(bob).sql("select public.admin_merge_coffees_v1($1, $2)", [duplicate, coffeeId]),
    ).rejects.toThrow(/not_allowed/);
    await expect(
      db.as(owner).sql("select public.admin_merge_coffees_v1($1, $1)", [coffeeId]),
    ).rejects.toThrow(/merge_same_target/);
    await db.as(owner).sql("select public.admin_merge_coffees_v1($1, $2)", [duplicate, coffeeId]);

    expect(await db.sql("select 1 from public.coffees where id = $1", [duplicate])).toEqual([]);
    const [stats] = await db
      .as(null)
      .sql("select tasting_count, avg_score from public.coffee_stats where coffee_id = $1", [
        coffeeId,
      ]);
    // Ada's 8 and Bob's 6, now on the same coffee.
    expect(Number(stats!.tasting_count)).toBe(2);
    expect(Number(stats!.avg_score)).toBe(7);
    const wishlist = await db.sql(
      "select 1 from public.tastings where user_id = $1 and status = 'wishlist'",
      [bob],
    );
    expect(wishlist).toHaveLength(1);
  });

  it("merges a misspelt brand, keeps the old spelling findable", async () => {
    const stray = await memberCoffee("Test Kavurucusu", "Yeni Harman");
    const twin = await memberCoffee("Test Kavurucusu", "Test Harman");
    await addTasting(bob, { coffee_id: twin, score: 4 });
    const [from] = await db.sql<{ id: string }>(
      "select id from public.brands where slug = 'test-kavurucusu'",
    );
    const [into] = await db.sql<{ id: string }>(
      "select id from public.brands where slug = 'test-kavurucu'",
    );

    await db.as(owner).sql("select public.admin_merge_brands_v1($1, $2)", [from!.id, into!.id]);

    expect(await db.sql("select 1 from public.brands where id = $1", [from!.id])).toEqual([]);
    // The coffee only the stray brand had moves over; the one both had becomes one.
    const coffees = await db.sql(
      "select name from public.coffees where brand_id = $1 order by name",
      [into!.id],
    );
    expect(coffees).toEqual([{ name: "Test Harman" }, { name: "Yeni Harman" }]);
    expect(await db.sql("select 1 from public.coffees where id = $1", [twin])).toEqual([]);
    expect(await db.sql("select brand_id from public.coffees where id = $1", [stray])).toEqual([
      { brand_id: into!.id },
    ]);
    const [found] = await db.sql<{ id: string }>(
      "select public.find_brand_id('TEST KAVURUCUSU') as id",
    );
    expect(found!.id).toBe(into!.id);
    // Search follows the move.
    const hits = await db
      .as(null)
      .sql<{ brand_name: string }>(
        "select brand_name from public.search_coffees_v1('kavurucu yeni harman') limit 1",
      );
    expect(hits).toEqual([{ brand_name: "Test Kavurucu" }]);
  });
});

describe("data export", () => {
  it("includes the member's comments, likes and reports", async () => {
    const top = await comment(bob, "Bob'un yorumu");
    await comment(ada, "Ada'nın yanıtı", { replyTo: top });
    await db
      .as(bob)
      .sql("insert into public.likes (user_id, tasting_id) values ($1, $2)", [bob, tastingId]);
    await db
      .as(bob)
      .sql(
        "insert into public.reports (reporter_id, target_type, target_id, reason) values ($1, 'profile', $2, 'spam')",
        [bob, ada],
      );

    const [row] = await db
      .as(bob)
      .sql<{ data: Record<string, unknown[]> & { profile: { username: string } } }>(
        "select public.export_my_data_v2() as data",
      );
    const { data } = row!;
    expect(data.profile.username).toBe("bob_test");
    expect(data.comments).toEqual([expect.objectContaining({ body: "Bob'un yorumu" })]);
    expect(data.likes).toEqual([expect.objectContaining({ tasting_id: tastingId })]);
    expect(data.reports).toEqual([
      expect.objectContaining({ target_type: "profile", reason: "spam", status: "open" }),
    ]);
    expect(JSON.stringify(data)).not.toContain("Ada'nın yanıtı");
    await expect(db.as(null).sql("select public.export_my_data_v2()")).rejects.toThrow(
      /permission denied/,
    );
  });
});
