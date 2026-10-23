// Writes src/lib/env.generated.ts from apps/mobile/.env (or .env.example where there is no
// .env, as in CI), so the settings are part of the bundle. Runs before start, ios, bundle and
// typecheck. Public values only: the same ones the website hands every browser.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = existsSync(join(root, ".env")) ? ".env" : ".env.example";

const values = {};
for (const line of readFileSync(join(root, source), "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, "");
}

const settings = {
  supabaseUrl: values.APP_SUPABASE_URL ?? "",
  supabaseKey: values.APP_SUPABASE_PUBLISHABLE_KEY ?? "",
  siteUrl: values.APP_SITE_URL ?? "",
};

const target = join(root, "src/lib/env.generated.ts");
const contents = `// Written by scripts/write-env.mjs from apps/mobile/${source}. Do not edit; not in git.
export const generated = ${JSON.stringify(settings, null, 2)} as const;
`;
if (!existsSync(target) || readFileSync(target, "utf8") !== contents) {
  writeFileSync(target, contents);
}
console.log(`env: ${source} → src/lib/env.generated.ts`);
