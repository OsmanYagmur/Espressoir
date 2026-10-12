"use server";

import { REPORT_TARGETS, RESTRICTION_DAYS, normalizeUsername } from "@espressoir/core";
import type { TypedSupabaseClient } from "@espressoir/db";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { ARCHIVE_TAG } from "@/lib/data/archive";

const PANEL = "/panel/yonetim";

// The refusals the database functions raise, as they appear in the error message.
const KNOWN_ERRORS = [
  "not_allowed",
  "target_not_found",
  "admin_cannot_be_restricted",
  "merge_same_target",
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
  updateTag(ARCHIVE_TAG);
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

export async function mergeBrand(formData: FormData): Promise<void> {
  const parsed = readMerge(formData);
  if (!parsed.success) back("invalid");
  await run((supabase) =>
    supabase.rpc("admin_merge_brands_v1", { p_from: parsed.data.from, p_into: parsed.data.into }),
  );
}
