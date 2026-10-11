/**
 * Accounts: onboarding, the "may this user post?" rule, usernames, private account data,
 * the data export and leaving. Same harness as rls.test.ts: every check runs as the role
 * the API would use.
 */
import { RESERVED_USERNAMES } from "@espressoir/core";
import { profileRowSchema } from "@espressoir/db";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

let db: TestDb;
let owner: string; // admin
let ada: string; // onboarded member
let newcomer: string; // signed up, has not finished onboarding
let coffeeId: string;

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
  newcomer = await createUser(db, { username: "yeni_test", onboarded: false });
  const [brand] = await db.sql<{ id: string }>(
    "insert into public.brands (name, created_by) values ('Test Kavurucu', $1) returning id",
    [ada],
  );
  const [coffee] = await db.sql<{ id: string }>(
    "insert into public.coffees (brand_id, name, created_by) values ($1, 'Test Harman', $2) returning id",
    [brand!.id, ada],
  );
  coffeeId = coffee!.id;
});
afterEach(async () => {
  await db.rollback();
});

const restrict = (userId: string, until: string) =>
  db.sql(
    `insert into public.profile_private (profile_id, restricted_until, restricted_reason)
     values ($1, now() + $2::interval, 'test')
     on conflict (profile_id) do update set restricted_until = excluded.restricted_until`,
    [userId, until],
  );

describe("who may post", () => {
  it("answers for the caller: onboarded yes, newcomer no, restricted no", async () => {
    const ask = async (userId: string) =>
      (await db.as(userId).sql<{ ok: boolean }>("select public.can_post() as ok"))[0]!.ok;

    expect(await ask(ada)).toBe(true);
    expect(await ask(newcomer)).toBe(false);

    await restrict(ada, "1 day");
    expect(await ask(ada)).toBe(false);
    // A restriction that has run out no longer counts.
    await restrict(ada, "-1 minute");
    expect(await ask(ada)).toBe(true);
  });

  it("is not something an anonymous visitor can call", async () => {
    await expect(db.as(null).sql("select public.can_post()")).rejects.toThrow(/permission denied/);
  });

  it("keeps a newcomer from writing anything until onboarding is done", async () => {
    const attempts: [string, unknown[]][] = [
      ["insert into public.tastings (user_id, coffee_id) values ($1, $2)", [newcomer, coffeeId]],
      ["insert into public.brands (name, created_by) values ('Erken', $1)", [newcomer]],
      [
        "insert into public.coffees (brand_id, name, created_by) select brand_id, 'Erken', $1 from public.coffees limit 1",
        [newcomer],
      ],
      ["insert into public.follows (follower_id, following_id) values ($1, $2)", [newcomer, ada]],
      ["update public.profiles set bio = 'merhaba' where id = $1", [newcomer]],
    ];
    for (const [statement, params] of attempts) {
      await expect(db.as(newcomer).sql(statement, params)).rejects.toThrow(/row-level security/);
    }
  });

  it("stops the tasting RPC for a newcomer too", async () => {
    await expect(
      db
        .as(newcomer)
        .sql("select * from public.log_tasting_v1(p_coffee_id => $1, p_score => 8::smallint)", [
          coffeeId,
        ]),
    ).rejects.toThrow(/row-level security/);
  });

  it("lets a restricted member read and delete, but not add or rewrite", async () => {
    const [mine] = await db.sql<{ id: string }>(
      "insert into public.tastings (user_id, coffee_id, score) values ($1, $2, 7) returning id",
      [ada, coffeeId],
    );
    await restrict(ada, "7 days");

    expect(await db.as(ada).sql("select id from public.tastings")).toHaveLength(1);
    await expect(
      db
        .as(ada)
        .sql("insert into public.tastings (user_id, coffee_id) values ($1, $2)", [ada, coffeeId]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.as(ada).sql("update public.tastings set notes = 'yeniden' where id = $1", [mine!.id]),
    ).rejects.toThrow(/row-level security/);
    expect(
      await db.as(ada).sql("delete from public.tastings where id = $1 returning id", [mine!.id]),
    ).toHaveLength(1);
  });
});

describe("private account data", () => {
  beforeEach(async () => {
    await restrict(ada, "1 day");
  });

  it("is visible to its owner and to admins only", async () => {
    const read = (userId: string | null) =>
      db.as(userId).sql("select profile_id from public.profile_private");

    expect(await read(ada)).toEqual([{ profile_id: ada }]);
    expect(await read(owner)).toEqual([{ profile_id: ada }]);
    expect(await read(newcomer)).toEqual([]);
    await expect(read(null)).rejects.toThrow(/permission denied/);
  });

  it("cannot be written through the API, not even by its owner", async () => {
    await expect(
      db.as(ada).sql("update public.profile_private set restricted_until = null"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db
        .as(newcomer)
        .sql("insert into public.profile_private (profile_id) values ($1)", [newcomer]),
    ).rejects.toThrow(/permission denied/);
    await expect(db.as(ada).sql("delete from public.profile_private")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("never lets a member set their own onboarding date", async () => {
    await expect(
      db
        .as(newcomer)
        .sql("update public.profiles set onboarded_at = now() where id = $1", [newcomer]),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("onboarding", () => {
  const onboard = (userId: string | null, username: string, terms: string | null = "v-test") =>
    db
      .as(userId)
      .sql<{ username: string }>("select public.complete_onboarding_v1($1, $2, $3) as username", [
        username,
        "  Yeni   Üye ",
        terms,
      ]);

  it("sets the name, records the terms and opens the account", async () => {
    expect(await onboard(newcomer, "  Yeni_Uye ")).toEqual([{ username: "yeni_uye" }]);

    const [profile] = await db.sql(
      "select username, display_name, onboarded_at is not null as onboarded from public.profiles where id = $1",
      [newcomer],
    );
    expect(profile).toEqual({ username: "yeni_uye", display_name: "Yeni Üye", onboarded: true });

    const [state] = await db.sql(
      "select terms_version, terms_accepted_at is not null as accepted, username_changed_at from public.profile_private where profile_id = $1",
      [newcomer],
    );
    // Choosing the first name does not start the 30-day clock.
    expect(state).toEqual({ terms_version: "v-test", accepted: true, username_changed_at: null });

    const posted = await db
      .as(newcomer)
      .sql("insert into public.tastings (user_id, coffee_id) values ($1, $2) returning id", [
        newcomer,
        coffeeId,
      ]);
    expect(posted).toHaveLength(1);
  });

  it("refuses names that are malformed, reserved or taken, and a missing acceptance", async () => {
    await expect(onboard(newcomer, "ab")).rejects.toThrow(/username_invalid/);
    await expect(onboard(newcomer, "çok güzel")).rejects.toThrow(/username_invalid/);
    await expect(onboard(newcomer, "Admin")).rejects.toThrow(/username_reserved/);
    await expect(onboard(newcomer, "ada_test")).rejects.toThrow(/username_taken/);
    await expect(onboard(newcomer, "yeni_uye", null)).rejects.toThrow(/terms_required/);
    await expect(onboard(newcomer, "yeni_uye", "   ")).rejects.toThrow(/terms_required/);

    const [profile] = await db.sql("select onboarded_at from public.profiles where id = $1", [
      newcomer,
    ]);
    expect(profile).toEqual({ onboarded_at: null });
  });

  it("happens once, and only for a signed-in user", async () => {
    await onboard(newcomer, "yeni_uye");
    await expect(onboard(newcomer, "baska_ad")).rejects.toThrow(/already_onboarded/);
    await expect(onboard(ada, "baska_ad")).rejects.toThrow(/already_onboarded/);
    await expect(onboard(null, "kimse")).rejects.toThrow(/permission denied/);
  });
});

describe("usernames", () => {
  it("keep the reserved list identical in Postgres and TypeScript", async () => {
    const [row] = await db.sql<{ names: string[] }>("select public.reserved_usernames() as names");
    expect([...row!.names].sort()).toEqual([...RESERVED_USERNAMES].sort());
    // Every reserved name must be one the format allows, or reserving it is pointless.
    for (const name of RESERVED_USERNAMES) expect(name).toMatch(/^[a-z0-9_]{3,24}$/);
  });

  it("give a placeholder to a signup that asks for a reserved name", async () => {
    const sneaky = await createUser(db, { username: "admin", onboarded: false });
    const [profile] = await db.sql<{ username: string }>(
      "select username from public.profiles where id = $1",
      [sneaky],
    );
    expect(profile!.username).toMatch(/^u_[0-9a-f]{16}$/);
  });

  it("can be changed by the member, but not to a reserved name", async () => {
    await expect(
      db.as(ada).sql("update public.profiles set username = 'espressoir' where id = $1", [ada]),
    ).rejects.toThrow(/username_reserved/);

    const changed = await db
      .as(ada)
      .sql("update public.profiles set username = 'ada_yeni' where id = $1 returning username", [
        ada,
      ]);
    expect(changed).toEqual([{ username: "ada_yeni" }]);
  });

  it("can change only once in 30 days", async () => {
    await db.as(ada).sql("update public.profiles set username = 'ada_bir' where id = $1", [ada]);
    await expect(
      db.as(ada).sql("update public.profiles set username = 'ada_iki' where id = $1", [ada]),
    ).rejects.toThrow(/username_change_too_soon/);

    // Other profile fields are not affected by the wait.
    const bio = await db
      .as(ada)
      .sql("update public.profiles set bio = 'V60 seven biri.' where id = $1 returning id", [ada]);
    expect(bio).toHaveLength(1);

    await db.sql(
      "update public.profile_private set username_changed_at = now() - interval '31 days' where profile_id = $1",
      [ada],
    );
    const later = await db
      .as(ada)
      .sql("update public.profiles set username = 'ada_iki' where id = $1 returning username", [
        ada,
      ]);
    expect(later).toEqual([{ username: "ada_iki" }]);
  });

  it("do not bind admins or scripts", async () => {
    await db
      .as(owner)
      .sql("update public.profiles set username = 'owner_bir' where id = $1", [owner]);
    const again = await db
      .as(owner)
      .sql("update public.profiles set username = 'owner_iki' where id = $1 returning username", [
        owner,
      ]);
    expect(again).toEqual([{ username: "owner_iki" }]);

    // The database owner (import, bootstrap) may hand out a reserved name on purpose.
    const official = await db.sql(
      "update public.profiles set username = 'espressoir' where id = $1 returning username",
      [ada],
    );
    expect(official).toEqual([{ username: "espressoir" }]);
  });
});

describe("profile read model", () => {
  it("lists onboarded members with numbers from their public tastings only", async () => {
    await db.sql(
      `insert into public.tastings (user_id, coffee_id, score, tasted_at, visibility, status) values
         ($1, $2, 8, '2026-03-01', 'public', 'logged'),
         ($1, $2, 6, '2026-04-01', 'public', 'logged'),
         ($1, $2, null, '2026-05-01', 'public', 'logged'),
         ($1, $2, 10, '2026-06-01', 'private', 'logged'),
         ($1, $2, null, null, 'public', 'wishlist')`,
      [ada, coffeeId],
    );
    await db.sql(
      "insert into public.follows (follower_id, following_id) values ($1, $2), ($2, $1)",
      [owner, ada],
    );

    const visitor = db.as(null);
    const rows = await visitor.sql(
      "select to_jsonb(p) as row from public.profile_overview p order by username",
    );
    const profiles = rows.map((r) => profileRowSchema.parse(r.row));

    // The newcomer has no public profile yet.
    expect(profiles.map((profile) => profile.username)).toEqual(["ada_test", "owner_test"]);
    expect(profiles[0]).toMatchObject({
      id: ada,
      username: "ada_test",
      stats: {
        tastingCount: 3,
        ratedCount: 2,
        avgScore: 7,
        coffeeCount: 1,
        wishlistCount: 1,
        lastTastedAt: "2026-05-01",
        followerCount: 1,
        followingCount: 1,
      },
    });
    // The author gets the same public numbers: a profile does not change with the viewer.
    const [own] = await db
      .as(ada)
      .sql("select tasting_count, avg_score from public.profile_overview where user_id = $1", [
        ada,
      ]);
    expect(Number(own!.tasting_count)).toBe(3);
    expect(Number(own!.avg_score)).toBe(7);
  });
});

describe("data export", () => {
  it("returns the caller's own data and nobody else's", async () => {
    await db.sql(
      `insert into public.tastings (user_id, coffee_id, score, notes, visibility) values
         ($1, $3, 8, 'Ada''nın gizli notu', 'private'),
         ($2, $3, 5, 'Owner''ın notu', 'public')`,
      [ada, owner, coffeeId],
    );
    await db.sql("insert into public.follows (follower_id, following_id) values ($1, $2)", [
      ada,
      owner,
    ]);
    await restrict(owner, "1 day");

    const [row] = await db
      .as(ada)
      .sql<{ data: Record<string, unknown> }>("select public.export_my_data_v1() as data");
    const data = row!.data as {
      account: { id: string };
      profile: { username: string };
      account_state: unknown;
      tastings: { notes: string; brand: string; coffee: string }[];
      following: { username: string }[];
      followers: unknown[];
      brands_added: { name: string }[];
      coffees_added: { name: string }[];
    };

    expect(data.account.id).toBe(ada);
    expect(data.profile.username).toBe("ada_test");
    // Private tastings are part of one's own data; other people's tastings are not.
    expect(data.tastings).toEqual([
      expect.objectContaining({
        notes: "Ada'nın gizli notu",
        brand: "Test Kavurucu",
        coffee: "Test Harman",
      }),
    ]);
    expect(data.following).toEqual([expect.objectContaining({ username: "owner_test" })]);
    expect(data.followers).toEqual([]);
    expect(data.brands_added).toEqual([expect.objectContaining({ name: "Test Kavurucu" })]);
    expect(data.coffees_added).toEqual([expect.objectContaining({ name: "Test Harman" })]);
    // The owner's restriction is the owner's business.
    expect(data.account_state).toBeNull();
    expect(JSON.stringify(data)).not.toContain("Owner'ın notu");
  });

  it("is refused without a session", async () => {
    await expect(db.as(null).sql("select public.export_my_data_v1()")).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("leaving", () => {
  it("removes the account and what belongs to it, but leaves the catalog", async () => {
    await db.sql("insert into public.tastings (user_id, coffee_id, score) values ($1, $2, 8)", [
      ada,
      coffeeId,
    ]);
    await db.sql(
      "insert into public.follows (follower_id, following_id) values ($1, $2), ($2, $1)",
      [ada, owner],
    );
    await restrict(ada, "-1 minute");

    await db.as(ada).sql("select public.delete_my_account_v1()");

    const [left] = await db.sql(
      `select (select count(*)::int from auth.users where id = $1) as users,
              (select count(*)::int from public.profiles where id = $1) as profiles,
              (select count(*)::int from public.profile_private where profile_id = $1) as private_rows,
              (select count(*)::int from public.tastings where user_id = $1) as tastings,
              (select count(*)::int from public.follows where follower_id = $1 or following_id = $1) as follows`,
      [ada],
    );
    expect(left).toEqual({ users: 0, profiles: 0, private_rows: 0, tastings: 0, follows: 0 });

    // What they added to the shared catalog stays, with no name attached.
    const [coffee] = await db.sql("select name, created_by from public.coffees where id = $1", [
      coffeeId,
    ]);
    expect(coffee).toEqual({ name: "Test Harman", created_by: null });
    // Nobody else is affected.
    expect(await db.sql("select id from public.profiles where id = $1", [owner])).toHaveLength(1);
  });

  it("is not available to admins or anonymous visitors", async () => {
    await expect(db.as(owner).sql("select public.delete_my_account_v1()")).rejects.toThrow(
      /admin_cannot_delete_self/,
    );
    await expect(db.as(null).sql("select public.delete_my_account_v1()")).rejects.toThrow(
      /permission denied/,
    );
    expect(await db.sql("select id from auth.users where id = $1", [owner])).toHaveLength(1);
  });
});
