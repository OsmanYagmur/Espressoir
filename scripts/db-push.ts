/**
 * Applies pending migrations to the dev or prod Supabase project.
 *   pnpm db:push:dev [--dry-run]
 *   pnpm db:push:prod [--dry-run]   (asks you to type the prod project ref)
 */
import { spawnSync } from "node:child_process";

import {
  assertTarget,
  loadTargetEnv,
  parseTargetEnv,
  repoRoot,
  requireEnv,
} from "./lib/target-env";

async function main(): Promise<number> {
  const target = parseTargetEnv();
  loadTargetEnv(target);
  const dbUrl = requireEnv("SUPABASE_DB_URL");
  await assertTarget(target, dbUrl);

  const args = ["db", "push", "--db-url", dbUrl];
  if (process.argv.includes("--dry-run")) args.push("--dry-run");

  const result = spawnSync("supabase", args, { cwd: repoRoot, stdio: "inherit" });
  return result.status ?? 1;
}

main().then(
  (status) => process.exit(status),
  (error: unknown) => {
    console.error(`\n✗ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  },
);
