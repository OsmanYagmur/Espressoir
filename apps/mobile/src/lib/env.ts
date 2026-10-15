/**
 * The app's settings, from apps/mobile/.env (see .env.example). Public values only: the
 * same ones the website hands every browser. Expo inlines EXPO_PUBLIC_* at bundle time.
 */
function read(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`${name} eksik: apps/mobile/.env dosyasını .env.example'dan oluştur.`);
  }
  return value.replace(/\/+$/, "");
}

export const env = {
  supabaseUrl: read("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseKey: read(
    "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  siteUrl: read("EXPO_PUBLIC_SITE_URL", process.env.EXPO_PUBLIC_SITE_URL),
};
