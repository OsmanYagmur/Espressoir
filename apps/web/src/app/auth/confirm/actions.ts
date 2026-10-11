"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { t } from "@/lib/i18n";
import { createServerSupabase } from "@/lib/supabase/server";

export interface ConfirmState {
  error?: string;
}

// The kinds of e-mail link the site sends: sign-in, first sign-in after signup, invitation.
const LINK_TYPES: readonly EmailOtpType[] = ["email", "magiclink", "signup", "invite"];

export async function confirmLink(
  _previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const tokenHash = formData.get("token_hash");
  const type = LINK_TYPES.find((candidate) => candidate === formData.get("type"));
  if (typeof tokenHash !== "string" || !tokenHash || !type) return { error: t.auth.link.invalid };

  try {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      console.error("[auth] link refused:", error.status, error.code);
      return { error: t.auth.link.invalid };
    }
  } catch (error) {
    console.error("[auth] link failed:", error instanceof Error ? error.message : error);
    return { error: t.auth.notices.failed };
  }
  // New members are sent on from the panel to pick a username.
  redirect("/panel");
}
