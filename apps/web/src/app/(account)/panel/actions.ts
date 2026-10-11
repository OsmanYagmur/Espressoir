"use server";

import { siteConfig } from "@espressoir/core";
import {
  TASTING_INPUT_ERRORS,
  tastingInputSchema,
  toLogTastingArgs,
  toTastingUpdate,
  type TastingInputError,
} from "@espressoir/db";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { ARCHIVE_TAG, getArchive } from "@/lib/data/archive";
import { format, t } from "@/lib/i18n";
import { coffeePath } from "@/lib/routes";

export interface TastingFormState {
  /** Field name → message, for the fields that need fixing. */
  errors?: Record<string, string>;
  message?: string;
  /** What was submitted, so the form can show it again instead of going blank. */
  values?: Record<string, string>;
}

const TASTE_FIELDS = ["body", "acidity", "bitterness", "sweetness", "aftertaste"] as const;

/** "Today" where the archive lives; a tasting cannot be dated after it. */
function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: siteConfig.timeZone }).format(new Date());
}

function readForm(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [name, value] of formData.entries()) {
    if (typeof value === "string" && !name.startsWith("$")) values[name] = value;
  }
  const text = (name: string) => (values[name] ?? "").trim();
  const orNull = (name: string) => text(name) || null;
  const number = (name: string) =>
    text(name) === "" ? null : Number(text(name).replace(",", "."));
  const buyAgain = text("wouldBuyAgain");

  const input = {
    coffee:
      text("coffeeMode") === "new"
        ? {
            mode: "new",
            brandName: text("brandName"),
            coffeeName: text("coffeeName"),
            form: orNull("form"),
            capsuleSystem: orNull("capsuleSystem"),
            brandIntensity: number("brandIntensity"),
            originCountry: orNull("originCountry"),
          }
        : { mode: "existing", coffeeId: text("coffeeId") },
    status: text("status") || "logged",
    visibility: text("visibility") || "public",
    brewMethodSlug: orNull("brewMethodSlug"),
    device: orNull("device"),
    score: number("score"),
    tastedAt: orNull("tastedAt"),
    notes: orNull("notes"),
    ...Object.fromEntries(TASTE_FIELDS.map((field) => [field, number(field)])),
    wouldBuyAgain: buyAgain === "yes" ? true : buyAgain === "no" ? false : null,
    pricePaid: number("pricePaid"),
  };
  return { values, parsed: tastingInputSchema(today()).safeParse(input) };
}

function errorText(code: string): string {
  const known = TASTING_INPUT_ERRORS.find((error) => error === code) as
    TastingInputError | undefined;
  if (known === "notesTooLong") return format(t.panel.errors.notesTooLong, { max: 4000 });
  return t.panel.errors[known ?? "invalid"];
}

function validationState(error: z.ZodError, values: Record<string, string>): TastingFormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    // "coffee.brandName" → "brandName": the form's own field names.
    const field = String(issue.path.at(-1) ?? "form");
    errors[field] ??= errorText(issue.message);
  }
  return { errors, message: t.panel.errors.invalid, values };
}

/** Turns a database refusal into something a person can act on. */
function databaseMessage(error: { code?: string; message: string }): string {
  // The database keeps the limits (tastings, new coffees and brands per day).
  if (error.message.includes("rate_limited")) return t.panel.errors.rateLimited;
  if (error.message.includes("tastings_one_wishlist_per_coffee_key")) {
    return t.panel.errors.wishlistDuplicate;
  }
  if (error.code === "42501" || error.message.includes("row-level security")) {
    return t.panel.errors.notAllowed;
  }
  if (error.message.includes("not_authenticated")) return t.panel.errors.sessionExpired;
  if (error.message.includes("coffee_required")) return t.panel.errors.coffeeRequired;
  return t.panel.errors.failed;
}

export async function createTasting(
  _previous: TastingFormState,
  formData: FormData,
): Promise<TastingFormState> {
  const { supabase } = await requireUser();
  const { values, parsed } = readForm(formData);
  if (!parsed.success) return validationState(parsed.error, values);

  // One call, one transaction: brand and coffee are created only if they are new.
  const { data, error } = await supabase.rpc("log_tasting_v1", toLogTastingArgs(parsed.data));
  const created = data?.[0];
  if (error || !created) {
    return { message: error ? databaseMessage(error) : t.panel.errors.failed, values };
  }

  // The public pages are cached; this makes the new tasting show up right away.
  updateTag(ARCHIVE_TAG);
  redirect(coffeePath(created.brand_slug, created.coffee_slug));
}

export async function updateTasting(
  tastingId: string,
  _previous: TastingFormState,
  formData: FormData,
): Promise<TastingFormState> {
  const { supabase } = await requireUser();
  const { values, parsed } = readForm(formData);
  if (!parsed.success) return validationState(parsed.error, values);
  if (!z.uuid().safeParse(tastingId).success) return { message: t.panel.notFound, values };

  const { brewMethods } = await getArchive();
  const brewMethodId =
    brewMethods.find((method) => method.slug === parsed.data.brewMethodSlug)?.id ?? null;

  // Row level security limits this to the user's own tasting; no row back means it was
  // not theirs (or no longer exists).
  const { data, error } = await supabase
    .from("tastings")
    .update(toTastingUpdate(parsed.data, brewMethodId))
    .eq("id", tastingId)
    .select("id");
  if (error) return { message: databaseMessage(error), values };
  if (!data || data.length === 0) return { message: t.panel.notFound, values };

  updateTag(ARCHIVE_TAG);
  redirect("/panel");
}

export async function deleteTasting(tastingId: string): Promise<void> {
  const { supabase } = await requireUser();
  if (z.uuid().safeParse(tastingId).success) {
    await supabase.from("tastings").delete().eq("id", tastingId);
    updateTag(ARCHIVE_TAG);
  }
  redirect("/panel");
}
