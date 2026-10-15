import { env } from "./env";
import { supabase } from "./supabase";

const TIMEOUT_MS = 5000;

/**
 * After the app writes something the website shows, it asks the site to drop its cached
 * archive (POST /api/arsiv-tazele with the member's access token), so the change is on the
 * web at once rather than within the hour. Best effort: a failure changes nothing saved.
 */
export async function refreshSite(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;
  // The save is done; a slow site must not keep the form waiting.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    await fetch(`${env.siteUrl}/api/arsiv-tazele`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: abort.signal,
    });
  } catch {
    // The site will catch up within the hour.
  } finally {
    clearTimeout(timer);
  }
}
