/**
 * Loads a model's suggestions (made outside the site, on the export of
 * `pnpm export:analytics`) into public.recommendations. Members whose suggestions it holds
 * see them on /oneriler instead of the site's own.
 *
 *   pnpm import:recommendations --file <csv> --model <name> [--dry-run] [--env prod]
 *   pnpm import:recommendations --clear --model <name> [--env prod]
 *
 * The CSV has member_key, coffee_id, score and optionally reason (shown to the member,
 * at most 140 characters). Loading a model again replaces it. Anything wrong in the file
 * (an unknown member or coffee, a duplicate) refuses the whole import, with the lines.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  applyRecommendationImport,
  planRecommendationImport,
  type ImportPlan,
} from "./lib/analytics";
import { connectPostgres } from "./lib/postgres";
import {
  assertTarget,
  loadTargetEnv,
  parseTargetEnv,
  repoRoot,
  requireEnv,
} from "./lib/target-env";
import { parseCsvRecords } from "./notion/csv";

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : (process.argv[index + 1] ?? null);
}

async function main(): Promise<void> {
  const model = option("--model");
  const file = option("--file");
  const clear = process.argv.includes("--clear");
  const dryRun = process.argv.includes("--dry-run");
  if (!model || (!clear && !file)) {
    throw new Error(
      "Kullanım: pnpm import:recommendations --file <csv> --model <ad> [--dry-run] [--env prod]\n" +
        "          pnpm import:recommendations --clear --model <ad> [--env prod]",
    );
  }

  const target = parseTargetEnv();
  loadTargetEnv(target);
  const dbUrl = requireEnv("SUPABASE_DB_URL");
  await assertTarget(target, dbUrl);

  const client = await connectPostgres(dbUrl);
  try {
    let plan: ImportPlan;
    if (clear) {
      plan = { model, rows: [], members: 0, problems: [] };
    } else {
      const { header, records } = parseCsvRecords(readFileSync(resolve(repoRoot, file!), "utf8"));
      const missing = ["member_key", "coffee_id", "score"].filter((name) => !header.includes(name));
      if (missing.length > 0) throw new Error(`CSV'de eksik sütun: ${missing.join(", ")}`);
      plan = await planRecommendationImport(client, model, records);
    }

    if (plan.problems.length > 0) {
      console.error(`Yükleme yapılmadı, ${plan.problems.length} sorun var:`);
      for (const problem of plan.problems.slice(0, 50)) console.error(`  ${problem}`);
      process.exitCode = 1;
      return;
    }

    // One transaction: the model's old suggestions go and the new ones arrive together.
    await client.query("begin");
    await applyRecommendationImport(client, plan);
    await client.query(dryRun ? "rollback" : "commit");
    const what = clear
      ? `"${model}" modelinin önerileri silindi`
      : `"${model}": ${plan.rows.length} öneri, ${plan.members} üye`;
    console.log(`${dryRun ? "(deneme, geri alındı) " : "✓ "}${what} (hedef: ${target}).`);
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
