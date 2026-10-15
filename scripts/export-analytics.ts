/**
 * Writes the archive's public tastings, under stable pseudonyms, as CSV files for analysis
 * (a recommendation model in Python, say). Reads only; writes nothing to the database.
 *
 *   pnpm export:analytics               from dev
 *   pnpm export:analytics --env prod    from prod (asks for the project ref)
 *   pnpm export:analytics --offline     from the sample export, no database needed
 *
 * Output: data/analytics/<date>/ (git-ignored) with tastings.csv, coffees.csv,
 * flavor_tags.csv, brew_methods.csv and a README describing every column.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

import {
  ANALYTICS_README,
  readAnalyticsExport,
  toCsv,
  type AnalyticsExport,
} from "./lib/analytics";
import {
  applyMigrations,
  connectPostgres,
  createEmbeddedPostgres,
  type Queryable,
} from "./lib/postgres";
import { applySampleCafes, applySampleLists, applySampleTaste } from "./lib/sample-taste";
import {
  assertTarget,
  loadTargetEnv,
  parseTargetEnv,
  repoRoot,
  requireEnv,
} from "./lib/target-env";
import { applyImportPlan } from "./notion/apply";
import { parseCsvRecords } from "./notion/csv";
import { buildImportPlan } from "./notion/plan";

const SAMPLE = resolve(repoRoot, "scripts/notion/fixtures/sample-export.csv");

async function fromSample(): Promise<AnalyticsExport> {
  const db = await createEmbeddedPostgres();
  try {
    await applyMigrations(db);
    await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
      randomUUID(),
      "owner@example.test",
      JSON.stringify({ username: "owner" }),
    ]);
    const plan = buildImportPlan(parseCsvRecords(readFileSync(SAMPLE, "utf8")).records);
    await applyImportPlan(db as Queryable, plan, { ownerUsername: "owner" });
    await applySampleTaste(db as Queryable);
    await applySampleLists(db as Queryable, "owner");
    await applySampleCafes(db as Queryable, "owner");
    return await readAnalyticsExport(db as Queryable);
  } finally {
    await db.close();
  }
}

async function fromDatabase(): Promise<{ data: AnalyticsExport; target: string }> {
  const target = parseTargetEnv();
  loadTargetEnv(target);
  const dbUrl = requireEnv("SUPABASE_DB_URL");
  await assertTarget(target, dbUrl);
  const client = await connectPostgres(dbUrl);
  try {
    // One consistent snapshot, and a guarantee that nothing is written.
    await client.query("begin transaction isolation level repeatable read read only");
    const data = await readAnalyticsExport(client);
    await client.query("rollback");
    return { data, target };
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  const offline = process.argv.includes("--offline");
  const { data, target } = offline
    ? { data: await fromSample(), target: "örnek veri" }
    : await fromDatabase();

  const day = new Date().toISOString().slice(0, 10);
  const folder = resolve(repoRoot, "data/analytics", offline ? `${day}-ornek` : `${day}-${target}`);
  mkdirSync(folder, { recursive: true });
  writeFileSync(resolve(folder, "tastings.csv"), toCsv(data.tastings));
  writeFileSync(resolve(folder, "coffees.csv"), toCsv(data.coffees));
  writeFileSync(resolve(folder, "flavor_tags.csv"), toCsv(data.flavorTags));
  writeFileSync(resolve(folder, "brew_methods.csv"), toCsv(data.brewMethods));
  writeFileSync(resolve(folder, "README.md"), ANALYTICS_README);

  const members = new Set(data.tastings.rows.map((row) => row.member_key)).size;
  console.log(
    `✓ ${relative(repoRoot, folder)}: ${data.tastings.rows.length} tadım, ${members} üye, ` +
      `${data.coffees.rows.length} kahve (kaynak: ${target}).`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
