import { generated } from "./env.generated";

/**
 * The app's settings, from apps/mobile/.env (see .env.example), written into
 * env.generated.ts by scripts/write-env.mjs before every build. Public values only: the same
 * ones the website hands every browser.
 */
function read(name: string, value: string): string {
  if (!value) {
    throw new Error(`${name} eksik: apps/mobile/.env dosyasını .env.example'dan oluştur.`);
  }
  return value.replace(/\/+$/, "");
}

export const env = {
  supabaseUrl: read("APP_SUPABASE_URL", generated.supabaseUrl),
  supabaseKey: read("APP_SUPABASE_PUBLISHABLE_KEY", generated.supabaseKey),
  siteUrl: read("APP_SITE_URL", generated.siteUrl),
};
