/**
 * Imports the Notion "Coffee Tasting" export into the archive.
 *
 *   pnpm import:notion --offline      no database needed: tries the import on an empty,
 *                                     in-process Postgres and writes the report
 *   pnpm import:notion --dry-run      runs against dev inside a transaction, then rolls back
 *   pnpm import:notion                imports into dev
 *   pnpm import:notion --env prod     imports into prod (asks for the project ref)
 *
 *   pnpm seed:dev                     imports the sample export into dev (refuses prod)
 *
 * Options: --file <csv>      default data/notion-export.csv
 *          --pages <folder>  Notion's per-row .md pages; default data/notion-export/ if present
 *
 * Idempotent: rows already imported are recognised by their source reference and skipped,
 * so running it again never creates duplicates. Report: data/import-report.md
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import {
  applyMigrations,
  connectPostgres,
  createEmbeddedPostgres,
  type Queryable,
} from "./lib/postgres";
import { applySampleLists, applySampleTaste } from "./lib/sample-taste";
import {
  assertTarget,
  ENV_FILES,
  loadTargetEnv,
  parseTargetEnv,
  projectRefFromDbUrl,
  repoRoot,
  requireEnv,
} from "./lib/target-env";
import { applyImportPlan, type ApplyResult } from "./notion/apply";
import { parseCsvRecords } from "./notion/csv";
import { readNotionPages } from "./notion/pages";
import { buildImportPlan } from "./notion/plan";
import { renderReport, renderSummary, type ReportContext } from "./notion/report";
import { COLUMNS } from "./notion/rules";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const REPORT_FILE = resolve(repoRoot, "data/import-report.md");
const FIXTURES_FOLDER = resolve(repoRoot, "scripts/notion/fixtures");
const csvFile = resolve(repoRoot, option("--file") ?? "data/notion-export.csv");
const pagesFolder = resolve(repoRoot, option("--pages") ?? "data/notion-export");
const offline = flag("--offline");
const dryRun = flag("--dry-run");
/** The sample export (`pnpm seed:dev`), as opposed to somebody's own archive. */
const sample = csvFile.startsWith(FIXTURES_FOLDER);

async function main(): Promise<void> {
  if (!existsSync(csvFile)) {
    throw new Error(
      `${relative(repoRoot, csvFile)} bulunamadı. Notion → ••• → Export → "Markdown & CSV" ile aldığın CSV'yi buraya koy.`,
    );
  }
  const { header, records } = parseCsvRecords(readFileSync(csvFile, "utf8"));
  const missingColumns = Object.values(COLUMNS).filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`CSV'de beklenen kolonlar yok: ${missingColumns.join(", ")}`);
  }

  const pages = existsSync(pagesFolder) ? readNotionPages(pagesFolder) : [];
  const plan = buildImportPlan(records, pages);

  let result: ApplyResult;
  let context: Pick<ReportContext, "target" | "mode" | "ownerUsername">;

  if (offline) {
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
    result = await applyImportPlan(db as Queryable, plan, { ownerUsername });
    if (sample) {
      await applySampleTaste(db as Queryable);
      await applySampleLists(db as Queryable, ownerUsername);
    }
    await db.close();
    context = { target: "yok (geçici, boş veritabanı)", mode: "offline", ownerUsername };
  } else {
    const target = parseTargetEnv(args);
    if (target === "prod" && sample) {
      throw new Error("Örnek veri (seed) prod'a yazılamaz. Bu komut yalnızca dev içindir.");
    }
    loadTargetEnv(target);
    const dbUrl = requireEnv("SUPABASE_DB_URL");
    await assertTarget(target, dbUrl);
    const ownerUsername = requireEnv("OWNER_USERNAME");

    const client = await connectPostgres(dbUrl);
    try {
      // One transaction: the import lands completely or not at all.
      await client.query("begin");
      result = await applyImportPlan(client, plan, { ownerUsername });
      // The sample archive also gets taste profiles and tags (the export has no such columns).
      if (sample) {
        await applySampleTaste(client);
        await applySampleLists(client, ownerUsername);
      }
      await client.query(dryRun ? "rollback" : "commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      await client.end();
    }
    context = {
      target: `${target} (${projectRefFromDbUrl(dbUrl) ?? new URL(dbUrl).host})`,
      mode: dryRun ? "dry-run" : "applied",
      ownerUsername,
    };
  }

  mkdirSync(dirname(REPORT_FILE), { recursive: true });
  writeFileSync(
    REPORT_FILE,
    renderReport(plan, result, {
      ...context,
      generatedAt: new Date(),
      file: relative(repoRoot, csvFile),
    }),
  );

  const title = {
    offline: "Çevrimdışı önizleme",
    "dry-run": "Deneme (yazılmadı)",
    applied: "İçe aktarıldı",
  };
  console.log(`\n${title[context.mode]} — ${context.target}`);
  console.log(renderSummary(result, plan));
  console.log(`\nAyrıntılı rapor: ${relative(repoRoot, REPORT_FILE)}`);
}

main().catch((error: unknown) => {
  console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
