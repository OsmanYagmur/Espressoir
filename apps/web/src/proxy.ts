import type { Database } from "@espressoir/db";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/supabase/env";

/**
 * Runs only for the signed-in area (see `matcher`): public pages stay static and never
 * pass through here. It refreshes the Supabase session cookie and sends visitors to the
 * right side of the login. This is a convenience, not the security boundary: every query
 * is still checked by row level security in the database.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  let signedIn = false;

  try {
    const { url, publishableKey } = getSupabasePublicEnv();
    const supabase = createServerClient<Database>(url, publishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    });
    // Verifies the token's signature (and refreshes an expired session) without trusting
    // the cookie's contents as they are.
    const { data } = await supabase.auth.getClaims();
    signedIn = Boolean(data?.claims);
  } catch {
    // No Supabase configured (offline preview) or it is unreachable: treat as signed out.
  }

  const { pathname } = request.nextUrl;
  const target =
    !signedIn && (pathname.startsWith("/panel") || pathname.startsWith("/hesap"))
      ? "/giris"
      : signedIn && pathname === "/giris"
        ? "/panel"
        : null;
  if (!target) return response;

  const redirect = NextResponse.redirect(new URL(target, request.url));
  // Keep a session that was refreshed during this request.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ["/panel/:path*", "/hesap/:path*", "/giris"],
};
