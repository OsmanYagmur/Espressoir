import { slugify } from "@espressoir/core";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, createUser, type TestDb } from "../lib/test-db";

let db: TestDb;
let ada: string;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.begin();
  ada = await createUser(db, { username: "ada_test" });
});
afterEach(async () => {
  await db.rollback();
});

describe("log_tasting_v1", () => {
  it("creates the brand, the coffee and the tasting in one call", async () => {
    const [result] = await db.as(ada).sql(
      `select * from public.log_tasting_v1(
         p_brand_name => ' Kahve Dünyası ', p_coffee_name => 'Master Ristretto',
         p_form => 'capsule', p_capsule_system => 'nespresso_original', p_brand_intensity => 8::smallint,
         p_brew_method_slug => 'kapsul-makinesi', p_device => 'Nespresso C30',
         p_score => 8::smallint, p_tasted_at => '2025-08-17', p_notes => '  Gövdeli, kremalı.  ')`,
    );
    expect(result).toMatchObject({ brand_slug: "kahve-dunyasi", coffee_slug: "master-ristretto" });

    const [row] = await db.sql(
      `select brand_name, coffee_name, form, brand_intensity, brew_method_slug, device, score,
              notes, status, visibility, username
         from public.tasting_feed where tasting_id = $1`,
      [result!.tasting_id],
    );
    expect(row).toEqual({
      brand_name: "Kahve Dünyası",
      coffee_name: "Master Ristretto",
      form: "capsule",
      brand_intensity: 8,
      brew_method_slug: "kapsul-makinesi",
      device: "Nespresso C30",
      score: 8,
      notes: "Gövdeli, kremalı.",
      status: "logged",
      visibility: "public",
      username: "ada_test",
    });
  });

  it("reuses an existing brand and coffee instead of creating look-alikes", async () => {
    await db.sql("insert into public.brands (name, aliases) values ('Starbucks', '{Starbuck}')");
    const call = (brand: string, coffee: string) =>
      db
        .as(ada)
        .sql(
          "select coffee_id from public.log_tasting_v1(p_brand_name => $1, p_coffee_name => $2, p_form => 'ground')",
          [brand, coffee],
        );

    const [first] = await call("Starbuck", "House Blend");
    const [second] = await call("STARBUCKS", "house  blend");
    expect(second!.coffee_id).toBe(first!.coffee_id);

    const [counts] = await db.sql(
      `select (select count(*)::int from public.brands) as brands,
              (select count(*)::int from public.coffees) as coffees,
              (select count(*)::int from public.tastings) as tastings`,
    );
    expect(counts).toEqual({ brands: 1, coffees: 1, tastings: 2 });
  });

  it("never modifies a coffee that already exists", async () => {
    const [first] = await db
      .as(ada)
      .sql(
        "select coffee_id from public.log_tasting_v1(p_brand_name => 'Tchibo', p_coffee_name => 'Gold Selection', p_form => 'ground')",
      );
    await db
      .as(ada)
      .sql(
        "select 1 from public.log_tasting_v1(p_brand_name => 'Tchibo', p_coffee_name => 'Gold Selection', p_form => 'whole_bean')",
      );
    const [coffee] = await db.sql("select form from public.coffees where id = $1", [
      first!.coffee_id,
    ]);
    expect(coffee).toEqual({ form: "ground" });
  });

  it("accepts an existing coffee by id", async () => {
    const [created] = await db
      .as(ada)
      .sql(
        "select coffee_id from public.log_tasting_v1(p_brand_name => 'Tchibo', p_coffee_name => 'Gold Selection')",
      );
    const [again] = await db
      .as(ada)
      .sql(
        "select coffee_id, coffee_slug from public.log_tasting_v1(p_coffee_id => $1, p_status => 'wishlist')",
        [created!.coffee_id],
      );
    expect(again).toEqual({ coffee_id: created!.coffee_id, coffee_slug: "gold-selection" });
  });

  it("explains what is missing or unknown", async () => {
    const session = db.as(ada);
    await expect(
      session.sql("select 1 from public.log_tasting_v1(p_brand_name => 'Tchibo')"),
    ).rejects.toThrow(/coffee_required/);
    await expect(
      session.sql("select 1 from public.log_tasting_v1(p_coffee_id => gen_random_uuid())"),
    ).rejects.toThrow(/coffee_not_found/);
    await expect(
      session.sql(
        "select 1 from public.log_tasting_v1(p_brand_name => 'A', p_coffee_name => 'B', p_brew_method_slug => 'nope')",
      ),
    ).rejects.toThrow(/brew_method_not_found/);
    await expect(
      session.sql(
        "select 1 from public.log_tasting_v1(p_brand_name => 'A', p_coffee_name => 'B', p_score => 12::smallint)",
      ),
    ).rejects.toThrow(/tastings_score_range/);
  });

  it("leaves nothing behind when the tasting itself is rejected", async () => {
    await expect(
      db
        .as(ada)
        .sql(
          "select 1 from public.log_tasting_v1(p_brand_name => 'Ghost', p_coffee_name => 'Bean', p_score => 0::smallint)",
        ),
    ).rejects.toThrow();
    expect(await db.sql("select 1 from public.brands where slug = 'ghost'")).toHaveLength(0);
  });

  it("cannot be called by anonymous visitors", async () => {
    await expect(
      db
        .as(null)
        .sql("select 1 from public.log_tasting_v1(p_brand_name => 'A', p_coffee_name => 'B')"),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("slugify (SQL) and slugify (TypeScript)", () => {
  it("agree on the names this archive actually contains", async () => {
    const names = [
      "Kahve Dünyası",
      "Kurukahveci Mehmet Efendi ",
      "Jacob’s",
      "Jacob's",
      "İntenso Espresso",
      "Ristretto (Siyah Kapsül)",
      "Espresso 57 Dark&Chocolatey",
      "Papua New Guıne",
      "IĞDIR ŞEKERLİ ÇÖĞÜR",
      "Privat Kaffee African Blue",
      "Single-Origin Colombia",
      "Café Crème — Édition N°5",
      "  --çok   boşluklu--  ",
      "x".repeat(120),
    ];
    const rows = await db.sql<{ name: string; slug: string }>(
      "select name, public.slugify(name) as slug from unnest($1::text[]) as name",
      [names],
    );
    for (const row of rows) expect(row.slug, row.name).toBe(slugify(row.name));
  });
});
