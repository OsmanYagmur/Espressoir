import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export type TargetEnv = "dev" | "prod";

/**
 * Script secrets per target. The prod file is deliberately NOT `.env.production.local`:
 * Next.js loads that name automatically in production builds, so a local `pnpm build`
 * would silently point at the live database.
 */
export const ENV_FILES: Record<TargetEnv, string> = {
  dev: ".env.local",
  prod: ".env.prod.local",
};

export function parseTargetEnv(argv: readonly string[] = process.argv.slice(2)): TargetEnv {
  const index = argv.indexOf("--env");
  const value = index === -1 ? "dev" : argv[index + 1];
  if (value !== "dev" && value !== "prod") {
    throw new Error(`--env yalnızca "dev" ya da "prod" olabilir (verilen: ${String(value)}).`);
  }
  return value;
}

export function loadTargetEnv(target: TargetEnv): void {
  const file = resolve(repoRoot, ENV_FILES[target]);
  if (!existsSync(file)) {
    throw new Error(
      `${ENV_FILES[target]} bulunamadı. .env.example dosyasını kopyalayıp doldur (bkz. docs/setup-supabase.md).`,
    );
  }
  process.loadEnvFile(file);
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} ortam değişkeni boş. .env dosyanı kontrol et.`);
  return value;
}

/**
 * Extracts the Supabase project ref from a connection string:
 * pooler URLs carry it in the user ("postgres.<ref>"), direct URLs in the host ("db.<ref>.supabase.co").
 */
export function projectRefFromDbUrl(dbUrl: string): string | null {
  const url = new URL(dbUrl);
  const fromUser = /^postgres\.([a-z0-9]+)$/.exec(decodeURIComponent(url.username))?.[1];
  if (fromUser) return fromUser;
  return /^db\.([a-z0-9]+)\.supabase\.co$/.exec(url.hostname)?.[1] ?? null;
}

/**
 * Refuses to touch the wrong project. Dev commands must never reach prod; prod commands
 * additionally require typing the prod project ref, so they cannot run by accident.
 */
export async function assertTarget(target: TargetEnv, dbUrl: string): Promise<void> {
  const ref = projectRefFromDbUrl(dbUrl);
  const devRef = process.env.SUPABASE_DEV_PROJECT_REF?.trim();
  const prodRef = process.env.SUPABASE_PROD_PROJECT_REF?.trim();

  if (target === "dev") {
    if (ref && prodRef && ref === prodRef) {
      throw new Error("Dev hedefi prod projesini gösteriyor. İşlem durduruldu.");
    }
    if (ref && devRef && ref !== devRef) {
      throw new Error(
        `Bağlantı dev projesine (${devRef}) değil, ${ref} projesine gidiyor. İşlem durduruldu.`,
      );
    }
    return;
  }

  if (!ref || !prodRef || ref !== prodRef) {
    throw new Error("Prod bağlantısı SUPABASE_PROD_PROJECT_REF ile eşleşmiyor. İşlem durduruldu.");
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `⚠️  CANLI veritabanı (${prodRef}) üzerinde çalışılacak. Onaylamak için proje ref'ini yaz: `,
  );
  rl.close();
  if (answer.trim() !== prodRef) throw new Error("Onay verilmedi. İşlem durduruldu.");
}
