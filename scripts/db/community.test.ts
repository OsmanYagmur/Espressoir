/**
 * Community tastings: finding a coffee (and near-duplicates), the reviewed mark, rate
 * limits and the feed of followed people.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

let db: TestDb;
let owner: string; // admin
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
  owner = await createUser(db, { username: "owner_test", role: "admin" });
  ada = await createUser(db, { username: "ada_test" });
  bob = await createUser(db, { username: "bob_test" });
});
afterEach(async () => {
  await db.rollback();
});

async function addCoffee(brand: string, name: string): Promise<string> {
  const [found] = await db.sql<{ id: string }>("select public.find_brand_id($1) as id", [brand]);
  const brandId =
    found?.id ??
    (
      await db.sql<{ id: string }>("insert into public.brands (name) values ($1) returning id", [
        brand,
      ])
    )[0]!.id;
  const [coffee] = await db.sql<{ id: string }>(
    "insert into public.coffees (brand_id, name) values ($1, $2) returning id",
    [brandId, name],
  );
  return coffee!.id;
}

const search = async (query: string, as: string | null = null) =>
  (
    await db
      .as(as)
      .sql<{ brand_name: string; coffee_name: string }>(
        "select brand_name, coffee_name from public.search_coffees_v1($1)",
        [query],
      )
  ).map((row) => `${row.brand_name} ${row.coffee_name}`);

describe("coffee search", () => {
  beforeEach(async () => {
    await addCoffee("Kahve Dünyası", "Explore Colombia");
    await addCoffee("Kahve Dünyası", "Master Ristretto");
    await addCoffee("Starbucks", "Colombia");
    await addCoffee("Kurukahveci Mehmet Efendi", "Türk Kahvesi");
  });

  it("finds by brand, by name, and by both, ignoring case and Turkish letters", async () => {
    expect(await search("colombia")).toEqual([
      "Kahve Dünyası Explore Colombia",
      "Starbucks Colombia",
    ]);
    // Coffees that contain the words come first; looser matches may follow them.
    expect((await search("KAHVE DUNYASI")).slice(0, 2)).toEqual([
      "Kahve Dünyası Explore Colombia",
      "Kahve Dünyası Master Ristretto",
    ]);
    expect((await search("starbucks colombia"))[0]).toBe("Starbucks Colombia");
    expect((await search("turk kahvesi"))[0]).toBe("Kurukahveci Mehmet Efendi Türk Kahvesi");
  });

  it("tolerates typos, which is what makes it a duplicate check", async () => {
    expect(await search("Kahve Dunyasi Explor Colombiya")).toContain(
      "Kahve Dünyası Explore Colombia",
    );
    expect(await search("master ristreto")).toEqual(["Kahve Dünyası Master Ristretto"]);
  });

  it("returns nothing for noise and for queries too short to mean anything", async () => {
    expect(await search("zzzzqqq")).toEqual([]);
    expect(await search("k")).toEqual([]);
    expect(await search("   ")).toEqual([]);
  });

  it("is open to visitors and follows a renamed brand or coffee", async () => {
    expect(await search("ristretto", ada)).toHaveLength(1);

    await db.sql(
      "update public.brands set name = 'Kahve Dünyası A.Ş.' where slug = 'kahve-dunyasi'",
    );
    await db.sql("update public.coffees set name = 'Master Lungo' where name = 'Master Ristretto'");
    expect(await search("ristretto")).toEqual([]);
    expect((await search("a.ş. master lungo"))[0]).toBe("Kahve Dünyası A.Ş. Master Lungo");
  });

  it("treats wildcard characters in the query as plain text", async () => {
    expect(await search("%%")).toEqual([]);
    expect(await search("__")).toEqual([]);
  });
});

describe("reviewed coffees", () => {
  const add = async (as: string, name: string, extra = "") =>
    (
      await db.as(as).sql<{ reviewed: boolean; reviewed_by: string | null }>(
        `insert into public.coffees (brand_id, name, created_by${extra ? ", reviewed_at" : ""})
         select b.id, $1, $2${extra} from public.brands b where b.slug = 'test-kavurucu'
         returning reviewed_at is not null as reviewed, reviewed_by`,
        [name, as],
      )
    )[0]!;

  beforeEach(async () => {
    await db.sql("insert into public.brands (name) values ('Test Kavurucu')");
  });

  it("starts unreviewed when a member adds it, whatever they send", async () => {
    expect(await add(ada, "Üye Harmanı")).toEqual({ reviewed: false, reviewed_by: null });
    expect(await add(ada, "Kendince Onaylı", ", now()")).toEqual({
      reviewed: false,
      reviewed_by: null,
    });
  });

  it("is reviewed from the start when an admin or a script adds it", async () => {
    expect(await add(owner, "Yönetici Harmanı")).toEqual({ reviewed: true, reviewed_by: owner });
    const [imported] = await db.sql(
      `insert into public.coffees (brand_id, name) select id, 'İçe Aktarılan' from public.brands
       where slug = 'test-kavurucu' returning reviewed_at is not null as reviewed`,
    );
    expect(imported).toEqual({ reviewed: true });
  });

  it("shows in the list read model, and only an admin can change it", async () => {
    await add(ada, "Üye Harmanı");
    const [row] = await db
      .as(null)
      .sql("select is_reviewed from public.coffee_overview where coffee_name = 'Üye Harmanı'");
    expect(row).toEqual({ is_reviewed: false });

    const byMember = await db
      .as(ada)
      .sql("update public.coffees set reviewed_at = now() where name = 'Üye Harmanı' returning id");
    expect(byMember).toHaveLength(0);
    const byAdmin = await db
      .as(owner)
      .sql("update public.coffees set reviewed_at = now() where name = 'Üye Harmanı' returning id");
    expect(byAdmin).toHaveLength(1);
  });
});

describe("rate limits", () => {
  let coffeeId: string;
  beforeEach(async () => {
    coffeeId = await addCoffee("Test Kavurucu", "Test Harman");
  });

  const logTasting = (userId: string) =>
    db
      .as(userId)
      .sql("insert into public.tastings (user_id, coffee_id) values ($1, $2)", [userId, coffeeId]);

  it("stop the 31st tasting of a day, for that member only", async () => {
    await db.sql(
      "insert into public.tastings (user_id, coffee_id, visibility) select $1, $2, 'private' from generate_series(1, 30)",
      [ada, coffeeId],
    );
    await expect(logTasting(ada)).rejects.toThrow(/rate_limited/);
    // Through the RPC too: it runs with the caller's rights.
    await expect(
      db.as(ada).sql("select * from public.log_tasting_v1(p_coffee_id => $1)", [coffeeId]),
    ).rejects.toThrow(/rate_limited/);
    await expect(logTasting(bob)).resolves.toEqual([]);
  });

  it("count a rolling day: yesterday's entries no longer weigh", async () => {
    await db.sql(
      `insert into public.tastings (user_id, coffee_id, visibility, created_at)
       select $1, $2, 'private', now() - interval '25 hours' from generate_series(1, 30)`,
      [ada, coffeeId],
    );
    await expect(logTasting(ada)).resolves.toEqual([]);
  });

  it("cap new coffees at 5 and new brands at 3 a day", async () => {
    const [brand] = await db.sql<{ id: string }>(
      "select id from public.brands where slug = 'test-kavurucu'",
    );
    const addCoffeeAs = (name: string) =>
      db
        .as(ada)
        .sql("insert into public.coffees (brand_id, name, created_by) values ($1, $2, $3)", [
          brand!.id,
          name,
          ada,
        ]);
    for (let i = 1; i <= 5; i++) await addCoffeeAs(`Kahve ${i}`);
    await expect(addCoffeeAs("Kahve 6")).rejects.toThrow(/rate_limited/);

    const addBrandAs = (name: string) =>
      db.as(ada).sql("insert into public.brands (name, created_by) values ($1, $2)", [name, ada]);
    for (let i = 1; i <= 3; i++) await addBrandAs(`Marka ${i}`);
    await expect(addBrandAs("Marka 4")).rejects.toThrow(/rate_limited/);
  });

  it("do not bind admins or scripts", async () => {
    await db.sql(
      "insert into public.tastings (user_id, coffee_id, visibility) select $1, $2, 'private' from generate_series(1, 40)",
      [owner, coffeeId],
    );
    await expect(logTasting(owner)).resolves.toEqual([]);
  });
});

describe("following feed", () => {
  it("shows what the people one follows logged, including followers-only entries", async () => {
    const coffeeId = await addCoffee("Test Kavurucu", "Test Harman");
    await db.sql(
      `insert into public.tastings (user_id, coffee_id, score, visibility, status) values
         ($1, $3, 8, 'public', 'logged'),
         ($1, $3, 7, 'followers', 'logged'),
         ($1, $3, 9, 'private', 'logged'),
         ($1, $3, null, 'public', 'wishlist'),
         ($2, $3, 5, 'public', 'logged')`,
      [ada, owner, coffeeId],
    );
    await db.sql("insert into public.follows (follower_id, following_id) values ($1, $2)", [
      bob,
      ada,
    ]);

    const feed = (userId: string | null) =>
      db
        .as(userId)
        .sql<{ username: string; score: number }>(
          "select username, score from public.following_feed order by score",
        );

    // Bob follows Ada: her public and followers-only tastings, not her private one, not
    // her wishlist, and nothing from the owner he does not follow.
    expect(await feed(bob)).toEqual([
      { username: "ada_test", score: 7 },
      { username: "ada_test", score: 8 },
    ]);
    // Ada follows nobody.
    expect(await feed(ada)).toEqual([]);
    await expect(feed(null)).rejects.toThrow(/permission denied/);
  });
});
