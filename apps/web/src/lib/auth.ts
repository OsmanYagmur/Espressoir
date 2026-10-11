import "server-only";

import type { TypedSupabaseClient } from "@espressoir/db";
import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase/server";

export interface CurrentUser {
  id: string;
  /** From the sign-in session; never stored in the public schema. */
  email: string | null;
  username: string;
  role: "user" | "admin";
  /** False until the person has chosen a username and accepted the terms. */
  onboarded: boolean;
}

export interface Session {
  user: CurrentUser;
  supabase: TypedSupabaseClient;
}

/**
 * The signed-in user, checked with the auth server (not just read from the cookie), plus
 * a client that acts as them. Returns null when nobody is signed in.
 */
export async function getCurrentUser(): Promise<Session | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, role, onboarded_at")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) return null;

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
      username: profile.username,
      role: profile.role,
      onboarded: profile.onboarded_at !== null,
    },
    supabase,
  };
}

/** Signed in, whether or not onboarding is finished. Only the onboarding page wants this. */
export async function requireSession(): Promise<Session> {
  const session = await getCurrentUser();
  if (!session) redirect("/giris");
  return session;
}

/**
 * For pages and actions of the signed-in area: visitors are sent to the login, and people
 * who have not picked a username yet to the onboarding step. This is for navigation only;
 * what they may write is decided by the database (`can_post()`).
 */
export async function requireUser(): Promise<Session> {
  const session = await requireSession();
  if (!session.user.onboarded) redirect("/hesap/kurulum");
  return session;
}
