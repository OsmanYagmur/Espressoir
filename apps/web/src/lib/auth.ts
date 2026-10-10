import "server-only";

import type { TypedSupabaseClient } from "@espressoir/db";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  username: string;
  role: "user" | "admin";
}

/**
 * The signed-in user, checked with the auth server (not just read from the cookie), plus
 * a client that acts as them. Returns null when nobody is signed in.
 */
export async function getCurrentUser(): Promise<{
  user: CurrentUser;
  supabase: TypedSupabaseClient;
} | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) return null;

  return { user: { id: data.user.id, ...profile }, supabase };
}

/** For pages and actions of the signed-in area: anyone else is sent to the login. */
export async function requireUser() {
  const session = await getCurrentUser();
  if (!session) redirect("/giris");
  return session;
}
