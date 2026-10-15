import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  applyRecommendationImport,
  planRecommendationImport,
  readAnalyticsExport,
  toCsv,
} from "../lib/analytics";
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
    "insert into public.brands (name) values ('Öneri Kavurucu') returning id",
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

const keyOf = async (user: string) =>
  (await db.sql<{ key: string }>("select public.analytics_member_key($1) as key", [user]))[0]!.key;

async function taste(
  user: string,
  coffee: string,
  fields: { score?: number; visibility?: string; notes?: string; status?: string } = {},
): Promise<string> {
  const status = fields.status ?? "logged";
  const [row] = await db.sql<{ id: string }>(
    `insert into public.tastings (user_id, coffee_id, score, tasted_at, status, visibility, notes)
     values ($1, $2, $3, $4, $5::public.tasting_status, $6::public.tasting_visibility, $7)
     returning id`,
    [
      user,
      coffee,
      status === "logged" ? (fields.score ?? 8) : null,
      status === "logged" ? "2025-06-14" : null,
      status,
      fields.visibility ?? "public",
      fields.notes ?? null,
    ],
  );
  return row!.id;
}

describe("analysis export", () => {
  it("gives every member a stable pseudonym only the database can make", async () => {
    const first = await keyOf(ada);
    expect(first).toMatch(/^[0-9a-f]{16}$/);
    expect(await keyOf(ada)).toBe(first);
    expect(await keyOf(bob)).not.toBe(first);
    for (const role of [ada, null]) {
      await expect(
        db.as(role).sql("select public.analytics_member_key($1)", [ada]),
      ).rejects.toThrow(/permission denied/);
    }
    await expect(db.as(ada).sql("select salt from public.analytics_salt")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("holds public, visible, logged tastings only, without who wrote them", async () => {
    const shown = await taste(ada, coffees[0]!, { score: 9, notes: "Gizli kalmalı bir not" });
    await taste(ada, coffees[1]!, { visibility: "followers" });
    await taste(ada, coffees[2]!, { visibility: "private" });
    await taste(bob, coffees[3]!, { status: "wishlist" });
    const hidden = await taste(bob, coffees[0]!);
    await db.sql("update public.tastings set hidden_at = now() where id = $1", [hidden]);

    const data = await readAnalyticsExport(db);
    expect(data.tastings.rows).toEqual([
      expect.objectContaining({
        member_key: await keyOf(ada),
        coffee_id: coffees[0],
        score: 9,
        tasted_month: "2025-06",
      }),
    ]);
    const everything = [data.tastings, data.coffees, data.flavorTags, data.brewMethods]
      .map(toCsv)
      .join("");
    for (const secret of ["ada_test", ada, shown, "Gizli kalmalı", "2025-06-14"]) {
      expect(everything).not.toContain(secret);
    }
    expect(data.coffees.rows).toHaveLength(4);
    expect(data.flavorTags.rows).toHaveLength(20);
  });

  it("writes CSV that survives commas, quotes and line breaks", () => {
    expect(
      toCsv({
        columns: ["a", "b", "c"],
        rows: [{ a: 'Say "merhaba", lütfen', b: "iki\nsatır", c: null }],
      }),
    ).toBe('a,b,c\r\n"Say ""merhaba"", lütfen","iki\nsatır",\r\n');
  });
});

describe("a model's suggestions", () => {
  const record = (line: number, values: Record<string, string>) => ({ line, values });

  it("are loaded by pseudonym, replacing the model's previous ones", async () => {
    const adaKey = await keyOf(ada);
    const bobKey = await keyOf(bob);
    const plan = await planRecommendationImport(db, "defter-v1", [
      record(2, {
        member_key: adaKey,
        coffee_id: coffees[0]!,
        score: "0.9",
        reason: "  Kakao  sevenlere ",
      }),
      record(3, { member_key: adaKey, coffee_id: coffees[1]!, score: "0.4", reason: "" }),
      record(4, { member_key: bobKey, coffee_id: coffees[2]!, score: "1" }),
    ]);
    expect(plan).toMatchObject({ problems: [], members: 2 });
    await applyRecommendationImport(db, plan);
    // Another model's rows are left alone.
    await db.sql(
      "insert into public.recommendations (user_id, coffee_id, model, score) values ($1, $2, 'baska', 1)",
      [ada, coffees[3]],
    );

    const again = await planRecommendationImport(db, "defter-v1", [
      record(2, { member_key: adaKey, coffee_id: coffees[1]!, score: "0.7" }),
    ]);
    await applyRecommendationImport(db, again);
    expect(
      await db.sql(
        "select coffee_id, model, score, reason from public.recommendations order by model, coffee_id",
      ),
    ).toEqual([
      { coffee_id: coffees[3], model: "baska", score: 1, reason: null },
      { coffee_id: coffees[1], model: "defter-v1", score: 0.7, reason: null },
    ]);

    const first = await planRecommendationImport(db, "defter-v1", [
      record(2, {
        member_key: adaKey,
        coffee_id: coffees[0]!,
        score: "0.9",
        reason: "  Kakao  sevenlere ",
      }),
    ]);
    expect(first.rows[0]!.reason).toBe("Kakao sevenlere");
  });

  it("refuse a file with anything wrong in it, line by line", async () => {
    const adaKey = await keyOf(ada);
    const plan = await planRecommendationImport(db, "Defter V1", [
      record(2, { member_key: "0000000000000000", coffee_id: coffees[0]!, score: "1" }),
      record(3, {
        member_key: adaKey,
        coffee_id: "6f1c9f5e-0000-4000-8000-000000000000",
        score: "1",
      }),
      record(4, { member_key: adaKey, coffee_id: coffees[0]!, score: "çok" }),
      record(5, {
        member_key: adaKey,
        coffee_id: coffees[1]!,
        score: "1",
        reason: "x".repeat(141),
      }),
      record(6, { member_key: adaKey, coffee_id: coffees[2]!, score: "1" }),
      record(7, { member_key: adaKey, coffee_id: coffees[2]!, score: "2" }),
    ]);
    expect(plan.problems).toEqual([
      expect.stringContaining("Model adı"),
      expect.stringMatching(/^Satır 2: .*üye yok/),
      expect.stringMatching(/^Satır 3: .*kahve yok/),
      expect.stringMatching(/^Satır 4: score bir sayı olmalı/),
      expect.stringMatching(/^Satır 5: reason en fazla 140/),
      expect.stringMatching(/^Satır 7: aynı üye ve kahve/),
    ]);
    await expect(applyRecommendationImport(db, plan)).rejects.toThrow(/uygulanamaz/);
  });

  it("are read by their member only, and written by nobody through the API", async () => {
    await db.sql(
      `insert into public.recommendations (user_id, coffee_id, model, score, reason)
       values ($1, $2, 'defter-v1', 0.8, 'Gerekçe'), ($3, $2, 'defter-v1', 0.5, null)`,
      [ada, coffees[0], bob],
    );
    const read = (user: string | null) =>
      db.as(user).sql<{ user_id: string }>("select user_id from public.recommendations");
    expect(await read(ada)).toEqual([{ user_id: ada }]);
    expect(await read(admin)).toEqual([]);
    await expect(read(null)).rejects.toThrow(/permission denied/);
    await expect(
      db
        .as(ada)
        .sql(
          "insert into public.recommendations (user_id, coffee_id, model, score) values ($1, $2, 'x', 1)",
          [ada, coffees[1]],
        ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as(ada).sql("delete from public.recommendations where user_id = $1", [ada]),
    ).rejects.toThrow(/permission denied/);
  });

  it("follow a merged coffee, go with the account and into the data export", async () => {
    await db.sql(
      `insert into public.recommendations (user_id, coffee_id, model, score)
       values ($1, $2, 'defter-v1', 0.8), ($1, $3, 'defter-v1', 0.6)`,
      [ada, coffees[0], coffees[1]],
    );
    await db
      .as(admin)
      .sql("select public.admin_merge_coffees_v1($1, $2)", [coffees[0], coffees[2]]);
    expect(
      await db.sql(
        "select coffee_id from public.recommendations where user_id = $1 order by score",
        [ada],
      ),
    ).toEqual([{ coffee_id: coffees[1] }, { coffee_id: coffees[2] }]);

    const [row] = await db
      .as(ada)
      .sql<{ doc: { recommendations: unknown[] } }>("select public.export_my_data_v2() as doc");
    expect(row!.doc.recommendations).toMatchObject([
      { coffee: "Kahve 3", model: "defter-v1", score: 0.8 },
      { coffee: "Kahve 2", model: "defter-v1", score: 0.6 },
    ]);

    await db.sql("delete from auth.users where id = $1", [ada]);
    expect(await db.sql("select 1 from public.recommendations")).toEqual([]);
  });
});
