"use client";

import type { Database, TypedSupabaseClient } from "@espressoir/db";
import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "./env";

let client: TypedSupabaseClient | undefined;

/** Browser client (one per tab). Used by small client islands such as the account button. */
export function getBrowserSupabase(): TypedSupabaseClient {
  if (!client) {
    const { url, publishableKey } = getSupabasePublicEnv();
    client = createBrowserClient<Database>(url, publishableKey);
  }
  return client;
}
