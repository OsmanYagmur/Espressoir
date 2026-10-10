import "server-only";

import type { Database, TypedSupabaseClient } from "@espressoir/db";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnv } from "./env";

/**
 * Session-aware client for signed-in routes and Server Actions. Reading cookies makes the
 * route dynamic, so never use it on public pages — use createPublicClient() there.
 */
export async function createServerSupabase(): Promise<TypedSupabaseClient> {
  // Cookies first: while a page shell is being prerendered this is where rendering pauses,
  // before anything below can run without a request.
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabasePublicEnv();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy
          // refreshes the session on signed-in routes, so this is safe to ignore.
        }
      },
    },
  });
}
