import "server-only";

import type { Database, TypedSupabaseClient } from "@espressoir/db";
import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "./env";

/**
 * A client that acts with the project's secret key: it bypasses row level security and
 * can manage accounts. The one place the website holds such a key.
 *
 * It exists for the invitation screen only (inviting is an Auth admin call; there is no
 * way to do it as a signed-in user). Rules for anyone touching this:
 * - call it only from Server Actions that have already passed `requireAdmin()`;
 * - never use it to read or write the app's own tables (those go through the admin's
 *   session, where the database checks the role and writes the log);
 * - never import this module from a client component (`server-only` enforces it).
 *
 * Returns null where the key is not configured (offline preview, a deployment without
 * it): the invitation screen then explains what is missing instead of failing.
 */
export function createAdminClient(): TypedSupabaseClient | null {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) return null;
  const { url } = getSupabasePublicEnv();
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
