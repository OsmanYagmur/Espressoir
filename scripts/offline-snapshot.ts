/**
 * Builds data/archive-snapshot.json: the archive as the website would receive it from
 * Supabase, produced entirely on this machine (in-process Postgres + the Notion import).
 * `pnpm dev:offline` serves the site from that file, so pages can be previewed with real
 * data before any cloud project exists. Never used in production.
 *
 *   pnpm snapshot:offline [--file <csv>]    default: data/notion-export.csv, else the sample
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { parseArchive } from "@espressoir/db";

import { readArchiveRowsAsVisitor } from "./lib/archive-rows";
import { applyMigrations, createEmbeddedPostgres } from "./lib/postgres";
import { applySampleCafes, applySampleLists, applySampleTaste } from "./lib/sample-taste";
import { ENV_FILES, repoRoot } from "./lib/target-env";
import { applyImportPlan } from "./notion/apply";
import { parseCsvRecords } from "./notion/csv";
import { buildImportPlan } from "./notion/plan";

const OUTPUT = resolve(repoRoot, "data/archive-snapshot.json");
const WORKSHOPS_OUTPUT = resolve(repoRoot, "data/workshops-snapshot.json");
const SAMPLE = resolve(repoRoot, "scripts/notion/fixtures/sample-export.csv");
const OWN_EXPORT = resolve(repoRoot, "data/notion-export.csv");

const fileFlag = process.argv.indexOf("--file");
const csvFile =
  fileFlag !== -1
    ? resolve(repoRoot, process.argv[fileFlag + 1] ?? "")
    : existsSync(OWN_EXPORT)
      ? OWN_EXPORT
      : SAMPLE;

const envFile = resolve(repoRoot, ENV_FILES.dev);
if (existsSync(envFile)) process.loadEnvFile(envFile);
const ownerUsername = process.env.OWNER_USERNAME?.trim() || "owner";

const db = await createEmbeddedPostgres();
await applyMigrations(db);
await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)", [
  randomUUID(),
  "owner@example.test",
  JSON.stringify({ username: ownerUsername }),
]);
await db.query("update public.profiles set onboarded_at = created_at where username = $1", [
  ownerUsername,
]);
const plan = buildImportPlan(parseCsvRecords(readFileSync(csvFile, "utf8")).records);
await applyImportPlan(db, plan, { ownerUsername });
// The sample archive also gets taste profiles and tags, so the charts have something to show.
if (csvFile === SAMPLE) {
  await applySampleTaste(db);
  await applySampleLists(db, ownerUsername);
  await applySampleCafes(db, ownerUsername);
}

const rows = await readArchiveRowsAsVisitor(db);
// The workshop the migration adds, two weeks ahead of whenever the snapshot is made, so the
// workshop pages always have one to show.
await db.query(
  "update public.workshops set starts_at = date_trunc('day', now()) + interval '14 days 11 hours', ends_at = date_trunc('day', now()) + interval '14 days 13 hours 30 minutes'",
);
const workshops = (
  await db.query<{ row: unknown }>("select to_jsonb(o) as row from public.workshop_overview o")
).rows.map(({ row }) => row);
await db.close();

// Fail here, not in the browser, if the snapshot would not satisfy the app.
const archive = parseArchive(rows);

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, JSON.stringify(rows, null, 2));
writeFileSync(WORKSHOPS_OUTPUT, JSON.stringify(workshops, null, 2));
console.log(
  `✓ ${relative(repoRoot, OUTPUT)}: ${archive.coffees.length} kahve, ${archive.tastings.length} tadım, ${archive.profiles.length} profil (kaynak: ${relative(repoRoot, csvFile)})`,
);
