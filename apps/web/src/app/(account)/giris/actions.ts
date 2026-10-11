"use server";

import { redirect } from "next/navigation";

import { createServerSupabase } from "@/lib/supabase/server";

// Signing in happens in the browser (login-form.tsx); only signing out needs the server,
// to clear the session cookies it reads.
export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/");
}
