"use server";

import { REPORT_TARGETS, RESTRICTION_DAYS, normalizeUsername } from "@espressoir/core";
import type { TypedSupabaseClient } from "@espressoir/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { AUTH_CALLBACK_PATH } from "@/lib/auth-config";
import { refreshArchive } from "@/lib/data/refresh-archive";
import { removeMedia } from "@/lib/media-server";
import { createAdminClient } from "@/lib/supabase/admin";

const PANEL = "/osman/yonetim";

// The refusals the database functions raise, as they appear in the error message.
const KNOWN_ERRORS = [
  "not_allowed",
  "target_not_found",
  "admin_cannot_be_restricted",
  "merge_same_target",
  "target_has_no_photo",
  "cafe_has_visits",
  "request_not_open",
  "already_official",
] as const;

const id = z.uuid();
const target = z.enum(REPORT_TARGETS);

function back(error?: string): never {
  redirect(error ? `${PANEL}?hata=${error}` : `${PANEL}?tamam=1`);
}

/**
 * Runs one admin function as the signed-in admin (the database checks the role again and
 * writes the log), then refreshes the public pages and returns to the panel with the
 * outcome in the URL: these are plain forms, they work without JavaScript.
 */
async function run(
  call: (supabase: TypedSupabaseClient) => PromiseLike<{ error: { message: string } | null }>,
): Promise<never> {
  const { supabase } = await requireAdmin();
  const { error } = await call(supabase);
  if (error) {
    const known = KNOWN_ERRORS.find((code) => error.message.includes(code));
    if (!known) console.error("[admin] action refused:", error.message);
    back(known ?? "unknown");
  }
  refreshArchive();
  back();
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// Field names avoid "id", "hidden" and the like on purpose: a control named after a
// property of its form replaces that property (form.id would be the input, not a string).

export async function setHidden(formData: FormData): Promise<void> {
  const parsed = z.object({ type: target, id, hidden: z.enum(["0", "1"]) }).safeParse({
    type: formData.get("targetType"),
    id: formData.get("targetId"),
    hidden: formData.get("hide"),
  });
  if (!parsed.success) back("invalid");
  await run((supabase) =>
    supabase.rpc("admin_set_hidden_v1", {
      p_target_type: parsed.data.type,
      p_target_id: parsed.data.id,
      p_hidden: parsed.data.hidden === "1",
      p_reason: text(formData, "reason") || undefined,
    }),
  );
}

export async function removeContent(formData: FormData): Promise<void> {
  const parsed = z.object({ type: target, id, sure: z.literal("on") }).safeParse({
    type: formData.get("targetType"),
    id: formData.get("targetId"),
    sure: formData.get("sure"),
  });
  if (!parsed.success) back("invalid");
  await run((supabase) =>
    supabase.rpc("admin_delete_v1", {
      p_target_type: parsed.data.type,
      p_target_id: parsed.data.id,
      p_note: text(formData, "note") || undefined,
    }),
  );
}

export async function resolveReport(formData: FormData): Promise<void> {
  const parsed = z
    .object({ id, status: z.enum(["resolved", "dismissed"]) })
    .safeParse({ id: formData.get("reportId"), status: formData.get("status") });
  if (!parsed.success) back("invalid");
  await run((supabase) =>
    supabase.rpc("admin_resolve_report_v1", {
      p_report_id: parsed.data.id,
      p_status: parsed.data.status,
      p_note: text(formData, "note") || undefined,
    }),
  );
}

/** Restricts a member (by id, or by the username typed into the form) or lifts it (`days` empty). */
export async function restrictMember(formData: FormData): Promise<void> {
  const days = text(formData, "days");
  const length = days === "" ? null : Number(days);
  if (length !== null && !RESTRICTION_DAYS.some((option) => option === length)) back("invalid");

  const { supabase } = await requireAdmin();
  let userId = text(formData, "userId");
  if (!userId) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", normalizeUsername(text(formData, "username")))
      .maybeSingle();
    if (!data) back("user_not_found");
    userId = data.id;
  }
  if (!id.safeParse(userId).success) back("invalid");

  await run((client) =>
    client.rpc("admin_restrict_user_v1", {
      p_user_id: userId,
      p_days: length ?? undefined,
      p_reason: text(formData, "reason") || undefined,
    }),
  );
}

export async function reviewCoffee(formData: FormData): Promise<void> {
  const parsed = id.safeParse(formData.get("coffeeId"));
  if (!parsed.success) back("invalid");
  await run((supabase) => supabase.rpc("admin_review_coffee_v1", { p_coffee_id: parsed.data }));
}

const merge = z.object({ from: id, into: id, sure: z.literal("on") });
const readMerge = (formData: FormData) =>
  merge.safeParse({
    from: formData.get("from"),
    into: formData.get("into"),
    sure: formData.get("sure"),
  });

export async function mergeCoffee(formData: FormData): Promise<void> {
  const parsed = readMerge(formData);
  if (!parsed.success) back("invalid");
  await run((supabase) =>
    supabase.rpc("admin_merge_coffees_v1", { p_from: parsed.data.from, p_into: parsed.data.into }),
  );
}

export async function reviewCafe(formData: FormData): Promise<void> {
  const parsed = id.safeParse(formData.get("cafeId"));
  if (!parsed.success) back("invalid");
  await run((supabase) => supabase.rpc("admin_review_cafe_v1", { p_cafe_id: parsed.data }));
}

export async function mergeCafe(formData: FormData): Promise<void> {
  const parsed = readMerge(formData);
  if (!parsed.success) back("invalid");
  await run((supabase) =>
    supabase.rpc("admin_merge_cafes_v1", { p_from: parsed.data.from, p_into: parsed.data.into }),
  );
}

export async function resolveVerification(formData: FormData): Promise<void> {
  const parsed = z
    .object({ id, answer: z.enum(["approve", "reject"]) })
    .safeParse({ id: formData.get("requestId"), answer: formData.get("answer") });
  if (!parsed.success) back("invalid");
  await run((supabase) =>
    supabase.rpc("admin_resolve_verification_v1", {
      p_request_id: parsed.data.id,
      p_approve: parsed.data.answer === "approve",
      p_note: text(formData, "note") || undefined,
    }),
  );
}

export async function revokeOfficial(formData: FormData): Promise<void> {
  const parsed = z
    .object({ id, sure: z.literal("on") })
    .safeParse({ id: formData.get("officialId"), sure: formData.get("sure") });
  if (!parsed.success) back("invalid");
  await run((supabase) =>
    supabase.rpc("admin_revoke_official_v1", {
      p_official_id: parsed.data.id,
      p_note: text(formData, "note") || undefined,
    }),
  );
}

export async function mergeBrand(formData: FormData): Promise<void> {
  const parsed = readMerge(formData);
  if (!parsed.success) back("invalid");
  await run((supabase) =>
    supabase.rpc("admin_merge_brands_v1", { p_from: parsed.data.from, p_into: parsed.data.into }),
  );
}

// ── invitations ───────────────────────────────────────────────────────────────────────────
// These three use the secret key (lib/supabase/admin.ts): inviting, listing and cancelling
// invitations are Auth admin calls. Each starts with requireAdmin().

const AUTH_ERRORS: Record<string, string> = {
  email_exists: "invite_exists",
  email_address_invalid: "invite_email",
  email_address_not_authorized: "invite_smtp",
  over_email_send_rate_limit: "invite_rate",
};

/** Where the link in the e-mail leads: this deployment, whatever its address is. */
async function callbackUrl(): Promise<string | null> {
  const request = await headers();
  const origin =
    request.get("origin") ??
    (request.get("x-forwarded-host")
      ? `${request.get("x-forwarded-proto") ?? "https"}://${request.get("x-forwarded-host")}`
      : null);
  return origin ? new URL(AUTH_CALLBACK_PATH, origin).toString() : null;
}

/** Sends an invitation, or a fresh one to an address whose invitation ran out. */
export async function inviteMember(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = z.email().max(254).safeParse(text(formData, "email").toLowerCase());
  if (!email.success) back("invite_email");

  const admin = createAdminClient();
  const redirectTo = await callbackUrl();
  if (!admin || !redirectTo) back("invite_unavailable");

  const { error } = await admin.auth.admin.inviteUserByEmail(email.data, { redirectTo });
  if (error) {
    const known = AUTH_ERRORS[error.code ?? ""];
    if (!known) console.error("[admin] invitation refused:", error.status, error.code);
    back(known ?? "unknown");
  }
  back();
}

/**
 * Withdraws an invitation nobody has accepted. The account is looked up again here and
 * left alone unless it is exactly that: invited, never confirmed. A member's account is
 * never deleted from this screen.
 */
export async function cancelInvitation(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = id.safeParse(formData.get("userId"));
  if (!parsed.success) back("invalid");

  const admin = createAdminClient();
  if (!admin) back("invite_unavailable");

  const { data, error } = await admin.auth.admin.getUserById(parsed.data);
  if (error || !data.user) back("target_not_found");
  if (!data.user.invited_at || data.user.email_confirmed_at) back("invite_accepted");

  const removed = await admin.auth.admin.deleteUser(parsed.data);
  if (removed.error) {
    console.error("[admin] invitation not withdrawn:", removed.error.status, removed.error.code);
    back("unknown");
  }
  back();
}

// ── pictures ──────────────────────────────────────────────────────────────────────────────

/**
 * Takes a picture down: the row forgets it (and the act is logged) through the database,
 * then the files go too, removed as the admin (the bucket lets admins remove any file).
 */
export async function removePhoto(formData: FormData): Promise<void> {
  const parsed = z
    .object({ type: z.enum(["tasting", "profile"]), id })
    .safeParse({ type: formData.get("targetType"), id: formData.get("targetId") });
  if (!parsed.success) back("invalid");

  const { supabase } = await requireAdmin();
  const { data: previous, error } = await supabase.rpc("admin_remove_photo_v1", {
    p_target_type: parsed.data.type,
    p_target_id: parsed.data.id,
  });
  if (error) {
    const known = KNOWN_ERRORS.find((code) => error.message.includes(code));
    if (!known) console.error("[admin] photo not removed:", error.message);
    back(known ?? "unknown");
  }
  await removeMedia(supabase, [previous]);
  refreshArchive();
  back();
}
