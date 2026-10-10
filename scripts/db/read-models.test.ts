import { readFileSync } from "node:fs";

import {
  BREW_CATEGORIES,
  CAPSULE_SYSTEMS,
  COFFEE_FORMS,
  COFFEE_PROCESSES,
  ROAST_LEVELS,
  TASTING_STATUSES,
  TASTING_VISIBILITIES,
} from "@espressoir/core";
import { parseArchive } from "@espressoir/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { readArchiveRowsAsVisitor } from "../lib/archive-rows";
import { createTestDb, createUser, type TestDb } from "../lib/test-db";
import { applyImportPlan } from "../notion/apply";
import { parseCsvRecords } from "../notion/csv";
import { buildImportPlan } from "../notion/plan";

let db: TestDb;

beforeAll(async () => {
  db = await createTestDb();
});
afterAll(async () => {
  await db.close();
});

describe("database ↔ app contract", () => {
  it("keeps the TypeScript value sets identical to the Postgres enums", async () => {
    const [row] = await db.sql(`
      select enum_range(null::public.coffee_form)::text[] as coffee_form,
             enum_range(null::public.capsule_system)::text[] as capsule_system,
             enum_range(null::public.coffee_process)::text[] as coffee_process,
             enum_range(null::public.roast_level)::text[] as roast_level,
             enum_range(null::public.brew_category)::text[] as brew_category,
             enum_range(null::public.tasting_status)::text[] as tasting_status,
             enum_range(null::public.tasting_visibility)::text[] as tasting_visibility
    `);
    expect(row).toEqual({
      coffee_form: [...COFFEE_FORMS],
      capsule_system: [...CAPSULE_SYSTEMS],
      coffee_process: [...COFFEE_PROCESSES],
      roast_level: [...ROAST_LEVELS],
      brew_category: [...BREW_CATEGORIES],
      tasting_status: [...TASTING_STATUSES],
      tasting_visibility: [...TASTING_VISIBILITIES],
    });
  });

  it("serves read models that the app's schemas accept, and hides non-public tastings", async () => {
    await db.begin();
    try {
      await createUser(db, { username: "owner_test", role: "admin" });
      const fixture = readFileSync(
        new URL("../notion/fixtures/sample-export.csv", import.meta.url),
        "utf8",
      );
      await applyImportPlan(db, buildImportPlan(parseCsvRecords(fixture).records), {
        ownerUsername: "owner_test",
      });
      await db.sql(
        "update public.tastings set visibility = 'private' where source_ref = 'nescafe/gold-filtre-kahve@2025-03-14'",
      );

      // Read inside the test transaction, as an anonymous visitor would through the API.
      const visitor = db.as(null);
      const json = async (query: string) =>
        (
          await visitor.sql<{ rows: unknown[] }>(
            `select coalesce(json_agg(r), '[]'::json) as rows from (${query}) as r`,
          )
        )[0]!.rows;
      const archive = parseArchive({
        coffees: await json("select * from public.coffee_overview"),
        tastings: await json("select * from public.tasting_feed"),
        brewMethods: await json("select * from public.brew_methods"),
      });

      expect(archive.coffees).toHaveLength(20);
      expect(archive.tastings).toHaveLength(19);
      expect(archive.brewMethods).toHaveLength(10);

      const ristretto = archive.coffees.find((coffee) => coffee.slug === "ristretto-siyah-kapsul");
      expect(ristretto).toMatchObject({
        name: "Ristretto (Siyah Kapsül)",
        brand: { slug: "nespresso", name: "Nespresso" },
        form: "capsule",
        capsuleSystem: "nespresso_original",
        brandIntensity: 10,
        stats: {
          tastingCount: 1,
          ratedCount: 1,
          avgScore: 9,
          distribution: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
          lastTastedAt: "2025-07-07",
          brewMethodSlugs: ["kapsul-makinesi"],
        },
      });
      // The private tasting no longer counts towards its coffee's public numbers.
      const nescafe = archive.coffees.find((coffee) => coffee.brand.slug === "nescafe");
      expect(nescafe?.stats).toMatchObject({ tastingCount: 0, avgScore: null });
    } finally {
      await db.rollback();
    }
  });

  it("can be read outside a transaction by the snapshot helper", async () => {
    if (!db.embedded) return;
    const rows = await readArchiveRowsAsVisitor(db);
    expect(parseArchive(rows).brewMethods).toHaveLength(10);
  });
});
