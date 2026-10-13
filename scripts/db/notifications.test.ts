import { NOTIFICATIONS_KEPT, NOTIFICATION_TYPES } from "@espressoir/core";
import { notificationRowSchema, type Notification } from "@espressoir/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

let db: TestDb;
let ada: string;
let bob: string;
let cem: string;
let admin: string;
let tasting: string;

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
  cem = await createUser(db, { username: "cem_test" });
  admin = await createUser(db, { username: "admin_test", role: "admin" });
  // Ada's tasting: the thing people like and talk under.
  const [row] = await db.as(ada).sql<{ tasting_id: string }>(
    `select tasting_id from public.log_tasting_v1(
       p_brand_name => 'Bildirim Kavurucu', p_coffee_name => 'Deneme',
       p_score => 8::smallint, p_tasted_at => '2026-10-01')`,
  );
  tasting = row!.tasting_id;
});
afterEach(async () => {
  await db.rollback();
});

/** A member's notifications as the API would serve them, newest first. */
async function inbox(user: string): Promise<Notification[]> {
  const rows = await db
    .as(user)
    .sql<{ row: unknown }>(
      "select to_jsonb(f) as row from public.notification_feed f order by f.created_at desc, f.notification_id",
    );
  return rows.map(({ row }) => notificationRowSchema.parse(row));
}
const kinds = async (user: string) => (await inbox(user)).map((n) => n.type).sort();

const like = (user: string, on = tasting) =>
  db.as(user).sql("insert into public.likes (user_id, tasting_id) values ($1, $2)", [user, on]);
const unlike = (user: string) =>
  db
    .as(user)
    .sql("delete from public.likes where user_id = $1 and tasting_id = $2", [user, tasting]);
const follow = (user: string, whom: string) =>
  db
    .as(user)
    .sql("insert into public.follows (follower_id, following_id) values ($1, $2)", [user, whom]);
async function comment(user: string, body: string, replyTo: string | null = null): Promise<string> {
  const [row] = await db
    .as(user)
    .sql<{ id: string }>(
      "insert into public.comments (tasting_id, user_id, parent_id, body) values ($1, $2, $3, $4) returning id",
      [tasting, user, replyTo, body],
    );
  return row!.id;
}
const markRead = (user: string | null) =>
  db.as(user).sql<{ n: number }>("select public.mark_notifications_read_v1() as n");

describe("notifications", () => {
  it("tell the author about a like, with who and what", async () => {
    await like(bob);
    expect(await inbox(ada)).toMatchObject([
      {
        type: "like",
        read: false,
        actor: { username: "bob_test" },
        tasting: { id: tasting, brandName: "Bildirim Kavurucu", coffeeName: "Deneme" },
        excerpt: null,
      },
    ]);
    // Nobody else hears of it, the liker included.
    expect(await inbox(bob)).toEqual([]);
    expect(await inbox(cem)).toEqual([]);
  });

  it("tell about a comment and a reply, each to whom it concerns", async () => {
    // Ada's own comment under her own tasting concerns nobody.
    const adas = await comment(ada, "Kendi notum.");
    expect(await inbox(ada)).toEqual([]);

    const bobs = await comment(bob, "Bence de güzel, özellikle sütle. ".repeat(8));
    expect(await inbox(ada)).toMatchObject([{ type: "comment", actor: { username: "bob_test" } }]);
    expect((await inbox(ada))[0]!.excerpt).toHaveLength(140);

    // Cem answers Bob: Bob gets the reply, Ada (whose page it is) a comment.
    await comment(cem, "Katılıyorum.", bobs);
    expect(await inbox(bob)).toMatchObject([
      { type: "reply", actor: { username: "cem_test" }, excerpt: "Katılıyorum." },
    ]);
    expect(await kinds(ada)).toEqual(["comment", "comment"]);

    // Bob answers Ada's comment: one notification for Ada, as a reply, not two.
    await comment(bob, "Sana da yanıt.", adas);
    expect(await kinds(ada)).toEqual(["comment", "comment", "reply"]);
    // Answering oneself says nothing to oneself.
    await comment(bob, "Kendime not.", bobs);
    expect(await kinds(bob)).toEqual(["reply"]);
  });

  it("tell about a new follower", async () => {
    await follow(bob, ada);
    expect(await inbox(ada)).toMatchObject([
      { type: "follow", actor: { username: "bob_test" }, tasting: null },
    ]);
  });

  it("do not repeat for a like or a follow that is taken back and given again", async () => {
    await like(bob);
    await unlike(bob);
    // Unseen and taken back: gone.
    expect(await inbox(ada)).toEqual([]);

    await like(bob);
    expect((await markRead(ada))[0]!.n).toBe(1);
    await unlike(bob);
    await like(bob);
    // Seen once: it stays, and liking again adds nothing.
    expect(await inbox(ada)).toMatchObject([{ type: "like", read: true }]);

    await follow(cem, ada);
    await db.as(cem).sql("delete from public.follows where follower_id = $1", [cem]);
    await follow(cem, ada);
    expect(await kinds(ada)).toEqual(["follow", "like"]);
  });

  it("are withdrawn with what they point at", async () => {
    const bobs = await comment(bob, "Silinecek yorum.");
    const cems = await comment(cem, "Gizlenecek yorum.");
    await like(cem);
    expect(await kinds(ada)).toEqual(["comment", "comment", "like"]);

    await db.as(bob).sql("select public.delete_comment_v1($1)", [bobs]);
    await db
      .as(admin)
      .sql("select public.admin_set_hidden_v1('comment', $1, true, 'neden')", [cems]);
    expect(await kinds(ada)).toEqual(["like"]);

    // A hidden tasting is not talked about: nothing new, and what there was goes.
    await db
      .as(admin)
      .sql("select public.admin_set_hidden_v1('tasting', $1, true, 'neden')", [tasting]);
    expect(await inbox(ada)).toEqual([]);
    await db.as(admin).sql("select public.admin_set_hidden_v1('tasting', $1, false)", [tasting]);
    expect(await inbox(ada)).toEqual([]);
  });

  it("go with an account that is deleted, on either side", async () => {
    await like(bob);
    await follow(cem, ada);
    await db.as(bob).sql("select public.delete_my_account_v1()");
    expect(await kinds(ada)).toEqual(["follow"]);
    await db.as(ada).sql("select public.delete_my_account_v1()");
    const left = await db.sql("select 1 from public.notifications");
    expect(left).toEqual([]);
  });

  it("are read by their recipient only, and written by nobody", async () => {
    await like(bob);
    const direct = await db.as(bob).sql("select 1 from public.notifications");
    expect(direct).toEqual([]);
    expect(await db.as(ada).sql("select 1 from public.notifications")).toHaveLength(1);
    await expect(db.as(null).sql("select 1 from public.notifications")).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.as(null).sql("select 1 from public.notification_feed")).rejects.toThrow(
      /permission denied/,
    );

    await expect(
      db
        .as(bob)
        .sql(
          "insert into public.notifications (user_id, actor_id, type) values ($1, $2, 'follow')",
          [ada, bob],
        ),
    ).rejects.toThrow(/permission denied/);
    await expect(db.as(ada).sql("update public.notifications set read_at = now()")).rejects.toThrow(
      /permission denied/,
    );
    await expect(db.as(ada).sql("delete from public.notifications")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("are marked as read by their recipient, up to a moment", async () => {
    await like(bob);
    await follow(cem, ada);
    // Someone else's call touches nothing of Ada's.
    expect((await markRead(bob))[0]!.n).toBe(0);
    await expect(markRead(null)).rejects.toThrow(/permission denied/);

    // "Up to" a moment before they arrived: nothing; up to now: both.
    const [early] = await db
      .as(ada)
      .sql<{ n: number }>(
        "select public.mark_notifications_read_v1(now() - interval '1 hour') as n",
      );
    expect(early!.n).toBe(0);
    expect((await markRead(ada))[0]!.n).toBe(2);
    expect((await inbox(ada)).every((n) => n.read)).toBe(true);
    expect((await markRead(ada))[0]!.n).toBe(0);
  });

  it(`keep the newest ${NOTIFICATIONS_KEPT} per member`, async () => {
    // More comments than the box holds (written as the database owner, who has no limits).
    await db.sql(
      `insert into public.comments (tasting_id, user_id, body)
       select $1, $2, 'yorum ' || n from generate_series(1, $3::int) as n`,
      [tasting, bob, NOTIFICATIONS_KEPT + 5],
    );
    const [row] = await db.sql<{ n: number }>(
      "select count(*)::int as n from public.notifications where user_id = $1",
      [ada],
    );
    expect(row!.n).toBe(NOTIFICATIONS_KEPT);
  });

  it("goes into the member's data export", async () => {
    await like(bob);
    const [row] = await db
      .as(ada)
      .sql<{ doc: { notifications: unknown[] } }>("select public.export_my_data_v2() as doc");
    expect(row!.doc.notifications).toMatchObject([
      { type: "like", from: "bob_test", tasting_id: tasting, read_at: null },
    ]);
  });

  it("knows the same kinds as the app", async () => {
    const [row] = await db.sql<{ def: string }>(
      "select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'notifications_type_known'",
    );
    const inDatabase = [...row!.def.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
    expect(inDatabase).toEqual([...NOTIFICATION_TYPES].sort());
  });
});
