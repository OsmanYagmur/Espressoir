import "server-only";

import type { Database, TypedSupabaseClient } from "@espressoir/db";
import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "./env";

/**
 * Anonymous, cookie-free client for public pages. It never reads the request, so pages
 * using it can be prerendered and cached ("use cache"). Only public rows are visible (RLS).
 */
export function createPublicClient(): TypedSupabaseClient {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
