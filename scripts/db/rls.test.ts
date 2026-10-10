/**
 * Row level security: one test per policy, each checked from the roles it should allow
 * and the roles it should stop. "Denied" comes in two flavours in Postgres: an error
 * (missing privilege, failed WITH CHECK) or silently zero rows (USING hides the row).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type Row, type TestDb } from "../lib/test-db";

let db: TestDb;
let owner: string; // admin, the archive's owner
let ada: string; // regular user
let bob: string; // regular user, follows ada
let coffeeId: string;
let v60: string;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});

beforeEach(async () => {
  await db.begin();
  owner = await createUser(db, { username: "owner_test", role: "admin" });
  ada = await createUser(db, { username: "ada_test" });
  bob = await createUser(db, { username: "bob_test" });
  await db.sql("insert into public.follows (follower_id, following_id) values ($1, $2)", [
    bob,
    ada,
  ]);
  const [brand] = await db.sql<{ id: string }>(
    "insert into public.brands (name, created_by) values ('Test Kavurucu', $1) returning id",
    [owner],
  );
  const [coffee] = await db.sql<{ id: string }>(
    "insert into public.coffees (brand_id, name, created_by) values ($1, 'Test Harman', $2) returning id",
    [brand!.id, owner],
  );
  coffeeId = coffee!.id;
  const [method] = await db.sql<{ id: string }>(
    "select id from public.brew_methods where slug = 'v60'",
  );
  v60 = method!.id;
});
afterEach(async () => {
  await db.rollback();
});

async function addTasting(userId: string, fields: Row = {}): Promise<string> {
  const row = { user_id: userId, coffee_id: coffeeId, score: 7, ...fields };
  const columns = Object.keys(row);
  const [inserted] = await db.sql<{ id: string }>(
    `insert into public.tastings (${columns.join(", ")})
     values (${columns.map((_, i) => `$${i + 1}`).join(", ")}) returning id`,
    Object.values(row),
  );
  return inserted!.id;
}

const ids = (rows: Row[]) => rows.map((row) => row.id).sort();

describe("profiles", () => {
  it("gives every new auth user a profile, using the requested username when valid", async () => {
    const rows = await db.sql("select username, role from public.profiles where id = $1", [ada]);
    expect(rows).toEqual([{ username: "ada_test", role: "user" }]);
  });

  it("falls back to a placeholder username when the requested one is taken or invalid", async () => {
    const taken = await createUser(db, { username: "ada_test" });
    const invalid = await createUser(db, { username: "Çok Geçersiz!" });
    const rows = await db.sql<{ username: string }>(
      "select username from public.profiles where id = any($1::uuid[])",
      [[taken, invalid]],
    );
    for (const row of rows) expect(row.username).toMatch(/^u_[0-9a-f]{16}$/);
  });

  it("is readable by everyone", async () => {
    const rows = await db.as(null).sql("select id from public.profiles where id = $1", [ada]);
    expect(rows).toHaveLength(1);
  });

  it("lets a user edit their own profile but nobody else's", async () => {
    const own = await db
      .as(ada)
      .sql("update public.profiles set display_name = 'Ada' where id = $1 returning id", [ada]);
    expect(own).toHaveLength(1);

    const other = await db
      .as(ada)
      .sql("update public.profiles set display_name = 'Hacked' where id = $1 returning id", [bob]);
    expect(other).toHaveLength(0);
  });

  it("never lets a user change a role, not even their own", async () => {
    await expect(
      db.as(ada).sql("update public.profiles set role = 'admin' where id = $1", [ada]),
    ).rejects.toThrow(/permission denied/);
  });

  it("rejects writes from anonymous visitors", async () => {
    await expect(
      db.as(null).sql("update public.profiles set bio = 'x' where id = $1", [ada]),
    ).rejects.toThrow(/permission denied/);
  });

  it("enforces the username format", async () => {
    await expect(
      db.as(ada).sql("update public.profiles set username = 'Bad Name' where id = $1", [ada]),
    ).rejects.toThrow(/profiles_username_format/);
  });
});

describe("brands and coffees", () => {
  it("are readable by everyone", async () => {
    expect(await db.as(null).sql("select id from public.brands")).toHaveLength(1);
    expect(await db.as(null).sql("select id from public.coffees")).toHaveLength(1);
  });

  it("cannot be created anonymously", async () => {
    await expect(
      db.as(null).sql("insert into public.brands (name) values ('Anon Brand')"),
    ).rejects.toThrow(/permission denied/);
  });

  it("can be created by a signed-in user, but only as themselves", async () => {
    const created = await db
      .as(ada)
      .sql(
        "insert into public.brands (name, created_by) values ('Ada Roasters', $1) returning slug",
        [ada],
      );
    expect(created).toEqual([{ slug: "ada-roasters" }]);

    await expect(
      db.as(ada).sql("insert into public.brands (name, created_by) values ('Forged', $1)", [bob]),
    ).rejects.toThrow(/row-level security/);
  });

  it("can only be corrected or removed by an admin", async () => {
    const byUser = await db.as(ada).sql("update public.brands set name = 'Vandal' returning id");
    expect(byUser).toHaveLength(0);
    const deletedByUser = await db.as(ada).sql("delete from public.coffees returning id");
    expect(deletedByUser).toHaveLength(0);

    const byAdmin = await db
      .as(owner)
      .sql("update public.coffees set form = 'ground' where id = $1 returning id", [coffeeId]);
    expect(byAdmin).toHaveLength(1);
  });

  it("derive the slug, tidy the name, and keep the slug when the name is fixed later", async () => {
    const [brand] = await db.sql<{ id: string; name: string; slug: string }>(
      "insert into public.brands (name) values ('  Kahve   Dünyası ') returning id, name, slug",
    );
    expect(brand).toMatchObject({ name: "Kahve Dünyası", slug: "kahve-dunyasi" });

    const [renamed] = await db.sql<{ slug: string }>(
      "update public.brands set name = 'Kahve Dünyası A.Ş.' where id = $1 returning slug",
      [brand!.id],
    );
    expect(renamed!.slug).toBe("kahve-dunyasi");
  });

  it("treat spelling variants of a brand as the same brand", async () => {
    await db.sql(
      "insert into public.brands (name, aliases) values ('Jacobs', '{Jacob''s Kaffee}')",
    );
    await expect(db.sql("insert into public.brands (name) values ('Jacob’s')")).rejects.toThrow(
      /brands_slug_key/,
    );

    const matches = await db.sql<{ found: boolean }>(
      `select public.find_brand_id(candidate) is not null as found
         from unnest(array['JACOBS', 'jacob''s', 'Jacob’s Kaffee', 'Jacobsen']) as candidate`,
    );
    expect(matches.map((row) => row.found)).toEqual([true, true, true, false]);
  });

  it("allow the same coffee name under different brands, but not twice under one", async () => {
    const [other] = await db.sql<{ id: string }>(
      "insert into public.brands (name) values ('Other') returning id",
    );
    await db.sql("insert into public.coffees (brand_id, name) values ($1, 'Test Harman')", [
      other!.id,
    ]);
    await expect(
      db.sql(
        "insert into public.coffees (brand_id, name) select brand_id, 'TEST harman' from public.coffees where id = $1",
        [coffeeId],
      ),
    ).rejects.toThrow(/coffees_brand_slug_key/);
  });

  it("only accept a capsule system on capsules", async () => {
    await expect(
      db.sql("update public.coffees set form = 'ground', capsule_system = 'vertuo' where id = $1", [
        coffeeId,
      ]),
    ).rejects.toThrow(/coffees_capsule_system_needs_capsule/);
  });
});

describe("brew methods and flavor tags", () => {
  it("ship with the reference data and are readable by everyone", async () => {
    const methods = await db
      .as(null)
      .sql("select slug from public.brew_methods order by sort_order");
    expect(methods.map((row) => row.slug)).toEqual([
      "v60",
      "filtre-kahve-makinesi",
      "chemex",
      "french-press",
      "aeropress",
      "kapsul-makinesi",
      "espresso-makinesi",
      "tasinabilir-espresso",
      "moka-pot",
      "turk-kahvesi",
    ]);
    const tags = await db.as(null).sql("select slug from public.flavor_tags");
    expect(tags.length).toBeGreaterThanOrEqual(20);
  });

  it("can only be changed by an admin", async () => {
    await expect(
      db
        .as(ada)
        .sql("insert into public.brew_methods (name, category) values ('Sifon', 'immersion')"),
    ).rejects.toThrow(/row-level security/);
    expect(await db.as(ada).sql("delete from public.flavor_tags returning id")).toHaveLength(0);

    const added = await db
      .as(owner)
      .sql(
        "insert into public.brew_methods (name, category) values ('Sifon', 'immersion') returning slug",
      );
    expect(added).toEqual([{ slug: "sifon" }]);
  });
});

describe("follows", () => {
  it("are public", async () => {
    expect(await db.as(null).sql("select * from public.follows")).toHaveLength(1);
  });

  it("can only be created as yourself, and never towards yourself", async () => {
    const ok = await db
      .as(ada)
      .sql(
        "insert into public.follows (follower_id, following_id) values ($1, $2) returning follower_id",
        [ada, bob],
      );
    expect(ok).toHaveLength(1);

    await expect(
      db
        .as(ada)
        .sql("insert into public.follows (follower_id, following_id) values ($1, $2)", [
          owner,
          ada,
        ]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db
        .as(ada)
        .sql("insert into public.follows (follower_id, following_id) values ($1, $1)", [ada]),
    ).rejects.toThrow(/follows_not_self/);
  });

  it("can only be removed by the follower", async () => {
    const byOther = await db.as(ada).sql("delete from public.follows returning follower_id");
    expect(byOther).toHaveLength(0);
    const byFollower = await db.as(bob).sql("delete from public.follows returning follower_id");
    expect(byFollower).toHaveLength(1);
  });
});

describe("tastings: who can read", () => {
  let publicId: string;
  let followersId: string;
  let privateId: string;

  beforeEach(async () => {
    publicId = await addTasting(ada, { visibility: "public" });
    followersId = await addTasting(ada, { visibility: "followers" });
    privateId = await addTasting(ada, { visibility: "private" });
  });

  it("anonymous visitors see public tastings only", async () => {
    expect(ids(await db.as(null).sql("select id from public.tastings"))).toEqual([publicId]);
  });

  it("the author sees all of their own", async () => {
    expect(ids(await db.as(ada).sql("select id from public.tastings"))).toEqual(
      [publicId, followersId, privateId].sort(),
    );
  });

  it("a follower also sees followers-only tastings, but never private ones", async () => {
    expect(ids(await db.as(bob).sql("select id from public.tastings"))).toEqual(
      [publicId, followersId].sort(),
    );
  });

  it("a signed-in stranger sees public tastings only", async () => {
    const stranger = await createUser(db, { username: "stranger_test" });
    expect(ids(await db.as(stranger).sql("select id from public.tastings"))).toEqual([publicId]);
  });

  it("an admin sees everything, for moderation", async () => {
    expect(await db.as(owner).sql("select id from public.tastings")).toHaveLength(3);
  });

  it("the feed view applies the same rules", async () => {
    const anon = await db
      .as(null)
      .sql("select tasting_id, username, brand_slug from public.tasting_feed");
    expect(anon).toEqual([
      { tasting_id: publicId, username: "ada_test", brand_slug: "test-kavurucu" },
    ]);
    expect(await db.as(bob).sql("select tasting_id from public.tasting_feed")).toHaveLength(2);
  });
});

describe("tastings: who can write", () => {
  it("anonymous visitors cannot", async () => {
    await expect(
      db
        .as(null)
        .sql("insert into public.tastings (user_id, coffee_id) values ($1, $2)", [ada, coffeeId]),
    ).rejects.toThrow(/permission denied/);
  });

  it("a user can log a tasting as themselves only", async () => {
    const own = await db
      .as(ada)
      .sql(
        "insert into public.tastings (user_id, coffee_id, brew_method_id, score) values ($1, $2, $3, 8) returning id",
        [ada, coffeeId, v60],
      );
    expect(own).toHaveLength(1);

    await expect(
      db
        .as(ada)
        .sql("insert into public.tastings (user_id, coffee_id) values ($1, $2)", [bob, coffeeId]),
    ).rejects.toThrow(/row-level security/);
  });

  it("a user cannot pass a tasting off as an import", async () => {
    await expect(
      db
        .as(ada)
        .sql(
          "insert into public.tastings (user_id, coffee_id, source, source_ref) values ($1, $2, 'notion_import', 'x')",
          [ada, coffeeId],
        ),
    ).rejects.toThrow(/row-level security/);
  });

  it("a user can edit and delete their own tastings but not someone else's", async () => {
    const adas = await addTasting(ada);
    const bobs = await addTasting(bob);

    expect(
      await db
        .as(ada)
        .sql("update public.tastings set score = 9 where id = $1 returning id", [adas]),
    ).toHaveLength(1);
    expect(
      await db
        .as(ada)
        .sql("update public.tastings set score = 1 where id = $1 returning id", [bobs]),
    ).toHaveLength(0);
    expect(
      await db.as(ada).sql("delete from public.tastings where id = $1 returning id", [bobs]),
    ).toHaveLength(0);
    expect(
      await db.as(ada).sql("delete from public.tastings where id = $1 returning id", [adas]),
    ).toHaveLength(1);

    const [untouched] = await db.sql("select score from public.tastings where id = $1", [bobs]);
    expect(untouched).toEqual({ score: 7 });
  });

  it("the owner and provenance of a tasting cannot be rewritten", async () => {
    const adas = await addTasting(ada);
    await expect(
      db.as(ada).sql("update public.tastings set user_id = $1 where id = $2", [bob, adas]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as(ada).sql("update public.tastings set source = 'notion_import' where id = $1", [adas]),
    ).rejects.toThrow(/permission denied/);
  });

  it("an admin can edit and delete any tasting", async () => {
    const adas = await addTasting(ada);
    expect(
      await db
        .as(owner)
        .sql("update public.tastings set visibility = 'private' where id = $1 returning id", [
          adas,
        ]),
    ).toHaveLength(1);
    expect(
      await db.as(owner).sql("delete from public.tastings where id = $1 returning id", [adas]),
    ).toHaveLength(1);
  });

  it("keeps scores within 1–10 and wishlist entries blank", async () => {
    await expect(addTasting(ada, { score: 11 })).rejects.toThrow(/tastings_score_range/);
    await expect(addTasting(ada, { score: 8, status: "wishlist" })).rejects.toThrow(
      /tastings_wishlist_is_blank/,
    );
    await addTasting(ada, { score: null, status: "wishlist" });
    await expect(addTasting(ada, { score: null, status: "wishlist" })).rejects.toThrow(
      /tastings_one_wishlist_per_coffee_key/,
    );
  });

  it("never duplicates an imported row", async () => {
    const imported = { source: "notion_import", source_ref: "row-1" };
    await addTasting(ada, imported);
    await expect(addTasting(ada, imported)).rejects.toThrow(/tastings_source_ref_key/);
  });
});

describe("tasting flavor tags", () => {
  it("are visible exactly when their tasting is, and editable by its author only", async () => {
    const hidden = await addTasting(ada, { visibility: "private" });
    const [tag] = await db.sql<{ id: string }>(
      "select id from public.flavor_tags where slug = 'ciceksi'",
    );

    await expect(
      db
        .as(bob)
        .sql("insert into public.tasting_flavor_tags (tasting_id, flavor_tag_id) values ($1, $2)", [
          hidden,
          tag!.id,
        ]),
    ).rejects.toThrow(/row-level security/);

    await db
      .as(ada)
      .sql("insert into public.tasting_flavor_tags (tasting_id, flavor_tag_id) values ($1, $2)", [
        hidden,
        tag!.id,
      ]);

    expect(await db.as(ada).sql("select * from public.tasting_flavor_tags")).toHaveLength(1);
    expect(await db.as(null).sql("select * from public.tasting_flavor_tags")).toHaveLength(0);
    expect(await db.as(bob).sql("select * from public.tasting_flavor_tags")).toHaveLength(0);
    expect(
      await db.as(bob).sql("delete from public.tasting_flavor_tags returning tasting_id"),
    ).toHaveLength(0);
  });
});

describe("coffee stats", () => {
  it("count only public, logged tastings, whoever is asking", async () => {
    await addTasting(ada, { score: 8, brew_method_id: v60, tasted_at: "2025-07-08" });
    await addTasting(bob, { score: 6, tasted_at: "2026-03-07" });
    await addTasting(bob, { score: null, tasted_at: "2026-03-08" });
    await addTasting(ada, { score: 1, visibility: "private" });
    await addTasting(owner, { score: null, status: "wishlist" });

    const expected = {
      tasting_count: 3,
      rated_count: 2,
      avg_score: "7.00",
      score_distribution: [0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
      brew_method_slugs: ["v60"],
    };
    const columns = Object.keys(expected).join(", ");
    for (const viewer of [null, ada, owner]) {
      const [stats] = await db
        .as(viewer)
        .sql(`select ${columns} from public.coffee_stats where coffee_id = $1`, [coffeeId]);
      expect(stats).toEqual(expected);
    }
  });

  it("list a coffee that nobody has tasted yet, with zeroes", async () => {
    const [row] = await db
      .as(null)
      .sql(
        "select brand_slug, coffee_slug, tasting_count, avg_score, brew_method_slugs from public.coffee_overview",
      );
    expect(row).toEqual({
      brand_slug: "test-kavurucu",
      coffee_slug: "test-harman",
      tasting_count: 0,
      avg_score: null,
      brew_method_slugs: [],
    });
  });
});
