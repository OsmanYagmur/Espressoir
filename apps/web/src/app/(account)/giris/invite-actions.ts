"use server";

import { INVITE_NOTE_MAX_LENGTH } from "@espressoir/core";
import {
  INVITE_REQUEST_ERRORS,
  inviteRequestInputSchema,
  toInviteRequestInsert,
  type InviteRequestError,
} from "@espressoir/db";

import { format, t } from "@/lib/i18n";
import { createPublicClient } from "@/lib/supabase/public";

const e = t.auth.invite.errors;

/** The form's own field names. */
export type InviteField = "email" | "note" | "consent";

export interface InviteFormState {
  /** The request is in: the form gives way to the thank-you note. */
  done?: boolean;
  /** Field → the sentence saying what to fix. */
  errors?: Partial<Record<InviteField, string>>;
  /** About the whole form: the database's refusal, or "fix the fields below". */
  message?: string;
  /** What was submitted, so the form shows it again instead of going blank. */
  values?: Partial<Record<"email" | "note", string>>;
}

function errorText(code: string): string {
  const known = INVITE_REQUEST_ERRORS.find((error) => error === code) as
    InviteRequestError | undefined;
  if (known === "noteTooLong") return format(e.noteTooLong, { max: INVITE_NOTE_MAX_LENGTH });
  return known ? e[known] : e.invalid;
}

/**
 * A request for an invitation, from a visitor without an account: checked here, then
 * written with the public key. Nobody can read the row back, and an address that has
 * already asked gets the same thanks as a new one, so the form never says who is on the
 * list.
 */
export async function requestInvite(
  _previous: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  // A field people never see: a form that arrives with it filled in was filled in by a
  // program. It gets the same thanks as everyone, and nothing is stored.
  if (text("website").trim() !== "") return { done: true };

  const values = { email: text("email"), note: text("note") };
  const parsed = inviteRequestInputSchema.safeParse({
    ...values,
    consent: formData.get("consent") === "on",
  });
  if (!parsed.success) {
    const errors: InviteFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0] ?? "") as InviteField] ??= errorText(issue.message);
    }
    return { errors, message: e.invalid, values };
  }

  try {
    const { error } = await createPublicClient()
      .from("invite_requests")
      .insert(toInviteRequestInsert(parsed.data));
    if (error && error.code !== "23505") {
      if (error.message.includes("rate_limited")) return { message: e.rateLimited, values };
      console.error("[invite] request refused:", error.code);
      return { message: e.failed, values };
    }
  } catch {
    // No Supabase configured (offline preview) or it is unreachable.
    return { message: e.failed, values };
  }
  return { done: true };
}
