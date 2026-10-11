import { NextResponse, type NextRequest } from "next/server";

import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Where the auth server sends the browser back to.
 *
 * - `?code=…`: Google sign-in, or a sign-in link built by Supabase's stock e-mail
 *   template. The code is exchanged for a session here.
 * - `?token_hash=…`: a link from our own e-mail templates. It is handed to /auth/confirm,
 *   which asks for one click before using it: mail scanners open links on their own, and
 *   a link that signs in on sight would be spent before its owner sees it.
 * - `?error=…`: the auth server refused (signup closed, link expired).
 *
 * Redirects stay on the origin of this request, so the same code serves localhost,
 * previews and the live site.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const to = (path: string) => NextResponse.redirect(new URL(path, origin));

  const tokenHash = searchParams.get("token_hash");
  if (tokenHash) {
    const confirm = new URL("/auth/confirm", origin);
    confirm.searchParams.set("token_hash", tokenHash);
    confirm.searchParams.set("type", searchParams.get("type") ?? "email");
    return NextResponse.redirect(confirm);
  }

  const code = searchParams.get("code");
  if (code) {
    try {
      const supabase = await createServerSupabase();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return to("/panel");
      console.error("[auth] code exchange refused:", error.status, error.code, error.message);
    } catch (error) {
      console.error("[auth] code exchange failed:", error instanceof Error ? error.message : error);
    }
    return to("/giris?hata=baglanti");
  }

  // The reason goes to the server log; the visitor gets one of three plain messages.
  const errorCode = searchParams.get("error_code");
  if (errorCode) console.error("[auth] callback error:", errorCode);
  if (errorCode === "signup_disabled") return to("/giris?hata=davet");
  return to(
    errorCode === "otp_expired" || !errorCode ? "/giris?hata=baglanti" : "/giris?hata=hata",
  );
}
