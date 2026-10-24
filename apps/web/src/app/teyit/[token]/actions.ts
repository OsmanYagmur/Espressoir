"use server";

import { WORKSHOP_RSVP_ANSWERS } from "@espressoir/core";
import { answerWorkshopRsvp, readWorkshopRsvp } from "@espressoir/db";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { createPublicClient } from "@/lib/supabase/public";
import { notifyRsvpNo } from "@/lib/workshop-mail";

/**
 * "Geliyorum" or "Gelemiyorum" from a personal answer page. No account: the token in the
 * address is the key, and the database decides whether an answer is still taken. A "no"
 * tells the owner by e-mail, after the answer is saved. Back to the same page, which shows
 * the answer (or why it was refused).
 */
export async function answerRsvp(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const answer = WORKSHOP_RSVP_ANSWERS.find((value) => value === formData.get("answer"));
  const page = `/teyit/${encodeURIComponent(token)}`;
  if (!answer) redirect(`${page}?hata=rsvp_invalid` as Route);

  const supabase = createPublicClient();
  const result = await answerWorkshopRsvp(supabase, token, answer);
  if (!result.ok) redirect(`${page}?hata=${result.error}` as Route);

  if (answer === "no") {
    after(async () => {
      const rsvp = await readWorkshopRsvp(supabase, token);
      if (rsvp) await notifyRsvpNo(rsvp);
    });
  }
  redirect(page as Route);
}
