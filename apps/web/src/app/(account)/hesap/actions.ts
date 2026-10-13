"use server";

import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  MEDIA_PATH_PATTERN,
  TERMS_VERSION,
} from "@espressoir/core";
import {
  ACCOUNT_INPUT_ERRORS,
  onboardingInputSchema,
  profileInputSchema,
  type AccountInputError,
} from "@espressoir/db";
import { redirect } from "next/navigation";
import type { z } from "zod";

import { requireSession, requireUser } from "@/lib/auth";
import { refreshArchive } from "@/lib/data/refresh-archive";
import { formatLongDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { removeAllMediaOf, removeMedia } from "@/lib/media-server";

export interface AccountFormState {
  /** Field name → message, for the fields that need fixing. */
  errors?: Record<string, string>;
  message?: string;
  /** What was submitted, so the form can show it again instead of going blank. */
  values?: Record<string, string>;
  saved?: boolean;
}

const e = t.account.errors;

function read(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [name, value] of formData.entries()) {
    if (typeof value === "string" && !name.startsWith("$")) values[name] = value;
  }
  return values;
}

function errorText(code: string): string {
  const known = ACCOUNT_INPUT_ERRORS.find((error) => error === code) as
    AccountInputError | undefined;
  if (known === "displayNameTooLong") {
    return format(e.displayNameTooLong, { max: DISPLAY_NAME_MAX_LENGTH });
  }
  if (known === "bioTooLong") return format(e.bioTooLong, { max: BIO_MAX_LENGTH });
  return e[known ?? "invalid"];
}

function validationState(error: z.ZodError, values: Record<string, string>): AccountFormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path.at(-1) ?? "form");
    errors[field] ??= errorText(issue.message);
  }
  return { errors, message: e.invalid, values };
}

/** Turns a database refusal into something a person can act on. */
function databaseState(
  error: { code?: string; message: string; details?: string | null },
  values: Record<string, string>,
): AccountFormState {
  const { message } = error;
  const username = (text: string): AccountFormState => ({
    errors: { username: text },
    message: e.invalid,
    values,
  });

  if (message.includes("username_taken") || message.includes("profiles_username_key")) {
    return username(e.usernameTaken);
  }
  if (message.includes("username_reserved")) return username(e.usernameReserved);
  if (message.includes("username_invalid") || message.includes("profiles_username_format")) {
    return username(e.usernameInvalid);
  }
  if (message.includes("username_change_too_soon")) {
    // The function reports the first day a change is allowed again (YYYY-MM-DD).
    const day = /^\d{4}-\d{2}-\d{2}$/.test(error.details ?? "") ? error.details! : null;
    return username(day ? format(e.usernameTooSoon, { date: formatLongDay(day) }) : e.failed);
  }
  if (message.includes("terms_required")) {
    return { errors: { acceptTerms: e.termsRequired }, message: e.invalid, values };
  }
  if (message.includes("not_authenticated")) return { message: e.sessionExpired, values };
  if (error.code === "42501" || message.includes("row-level security")) {
    return { message: e.restricted, values };
  }
  console.error("[account] database refused:", error.code, message);
  return { message: e.failed, values };
}

export async function completeOnboarding(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const { user, supabase } = await requireSession();
  if (user.onboarded) redirect("/panel");

  const values = read(formData);
  const parsed = onboardingInputSchema.safeParse({
    username: values.username ?? "",
    displayName: values.displayName ?? "",
    acceptTerms: values.acceptTerms === "on",
  });
  if (!parsed.success) return validationState(parsed.error, values);

  const { error } = await supabase.rpc("complete_onboarding_v1", {
    p_username: parsed.data.username,
    p_display_name: parsed.data.displayName ?? undefined,
    p_terms_version: TERMS_VERSION,
  });
  if (error) {
    if (error.message.includes("already_onboarded")) redirect("/panel");
    return databaseState(error, values);
  }

  // The member list is part of the cached archive; this makes the new profile page exist.
  refreshArchive();
  redirect("/panel");
}

export async function updateProfile(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const { user, supabase } = await requireUser();
  const values = read(formData);
  const parsed = profileInputSchema.safeParse({
    username: values.username ?? "",
    displayName: values.displayName ?? "",
    bio: values.bio ?? "",
  });
  if (!parsed.success) return validationState(parsed.error, values);

  // Row level security limits this to the member's own row; the username trigger decides
  // whether the name may change (reserved names, 30 days between changes).
  const { data, error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      display_name: parsed.data.displayName,
      bio: parsed.data.bio,
    })
    .eq("id", user.id)
    .select("username");
  if (error) return databaseState(error, values);
  if (!data || data.length === 0) return { message: e.failed, values };

  // Names appear next to tastings on public pages.
  refreshArchive();
  return { saved: true, values: { ...values, username: parsed.data.username } };
}

export async function deleteAccount(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const { user, supabase } = await requireSession();
  const values = read(formData);
  if ((values.confirm ?? "").trim().toLowerCase() !== user.username) {
    return { errors: { confirm: e.deleteMismatch }, values };
  }

  // The pictures are files, not rows: nothing in the database takes them along. They go
  // first, while there is still a session to remove them with. (An admin's account is
  // refused below, so theirs are left alone.)
  if (user.role !== "admin") await removeAllMediaOf(supabase, user.id);

  const { error } = await supabase.rpc("delete_my_account_v1");
  if (error) {
    if (error.message.includes("admin_cannot_delete_self")) return { message: e.deleteAdmin };
    console.error("[account] delete refused:", error.code, error.message);
    return { message: e.failed };
  }

  // The account is gone; this only clears the cookies of a session that no longer exists.
  await supabase.auth.signOut({ scope: "local" });
  refreshArchive();
  redirect("/");
}

/**
 * Makes an uploaded picture the member's profile picture, or removes the one they have
 * (null). The file of the picture it replaces is removed too.
 */
export async function setAvatar(
  path: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { supabase } = await requireUser();
  if (path !== null && !MEDIA_PATH_PATTERN.test(path)) {
    return { ok: false, message: t.photo.errors.failed };
  }

  const { data: previous, error } = await supabase.rpc("set_avatar_v1", {
    // The function takes null as "no picture"; the generated types do not know that.
    p_path: path as string,
  });
  if (error) {
    const restricted = error.code === "42501" || error.message.includes("not_allowed");
    if (!restricted) console.error("[account] avatar refused:", error.code, error.message);
    return {
      ok: false,
      message: restricted ? t.photo.errors.restricted : t.photo.errors.failed,
    };
  }
  if (previous && previous !== path) await removeMedia(supabase, [previous]);
  refreshArchive();
  return { ok: true };
}
