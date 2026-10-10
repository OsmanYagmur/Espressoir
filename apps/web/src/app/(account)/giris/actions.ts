"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { t } from "@/lib/i18n";
import { createServerSupabase } from "@/lib/supabase/server";

export interface SignInState {
  error?: string;
  email?: string;
}

const credentials = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});

export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = credentials.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) return { error: t.auth.invalid, email };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      // One message for "no such account" and "wrong password": never reveal which.
      return { error: error.status === 400 ? t.auth.invalid : t.auth.failed, email };
    }
  } catch {
    return { error: t.auth.failed, email };
  }
  redirect("/panel");
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/");
}
