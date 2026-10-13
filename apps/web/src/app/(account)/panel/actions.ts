"use server";

import {
  FLAVOR_TAGS_MAX,
  MEDIA_PATH_PATTERN,
  PHOTO_ALT_MAX_LENGTH,
  PHOTO_MAX_EDGE,
  siteConfig,
} from "@espressoir/core";
import type { TypedSupabaseClient } from "@espressoir/db";
import type { Route } from "next";
import {
  TASTING_INPUT_ERRORS,
  tastingInputSchema,
  toLogTastingArgs,
  toTastingUpdate,
  type TastingInputError,
} from "@espressoir/db";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { getArchive } from "@/lib/data/archive";
import { refreshArchive } from "@/lib/data/refresh-archive";
import { format, t } from "@/lib/i18n";
import { removeMedia } from "@/lib/media-server";
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
  // The one field with several values: kept as a list, and shown again from one string.
  const flavorTagSlugs = formData
    .getAll("flavorTagSlugs")
    .filter((value): value is string => typeof value === "string" && value !== "");
  values.flavorTagSlugs = flavorTagSlugs.join(",");
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
    flavorTagSlugs,
  };
  return { values, parsed: tastingInputSchema(today()).safeParse(input) };
}

const tooManyTags = format(t.panel.errors.tooManyTags, { max: FLAVOR_TAGS_MAX });

const edge = z.coerce.number().int().min(1).max(PHOTO_MAX_EDGE);
const photoFields = z.object({
  path: z.string().regex(MEDIA_PATH_PATTERN),
  width: edge,
  height: edge,
  alt: z
    .string()
    .trim()
    .max(PHOTO_ALT_MAX_LENGTH)
    .transform((value) => value || null),
});

/**
 * The picture the form carries, if any: it was uploaded by the browser already, and the
 * form only says where it went. Which file that may be is the database's call.
 */
function readPhoto(values: Record<string, string>) {
  const parsed = photoFields.safeParse({
    path: values.photoPath ?? "",
    width: values.photoWidth ?? "",
    height: values.photoHeight ?? "",
    alt: values.photoAlt ?? "",
  });
  return parsed.success ? parsed.data : null;
}

/**
 * Makes the tasting's picture what the form says (or none), and removes the file of the
 * picture it replaces. Returns the database's refusal, if any.
 */
async function savePhoto(
  supabase: TypedSupabaseClient,
  tastingId: string,
  photo: ReturnType<typeof readPhoto>,
) {
  const { data: previous, error } = await supabase.rpc("set_tasting_photo_v1", {
    p_tasting_id: tastingId,
    // The function takes null as "no picture"; the generated types do not know that.
    p_path: (photo?.path ?? null) as string,
    p_width: photo?.width,
    p_height: photo?.height,
    p_alt: photo?.alt ?? undefined,
  });
  if (error) return error;
  if (previous && previous !== photo?.path) await removeMedia(supabase, [previous]);
  return null;
}

function errorText(code: string): string {
  const known = TASTING_INPUT_ERRORS.find((error) => error === code) as
    TastingInputError | undefined;
  if (known === "notesTooLong") return format(t.panel.errors.notesTooLong, { max: 4000 });
  if (known === "tooManyTags") return tooManyTags;
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
  if (error.message.includes("too_many_flavor_tags")) return tooManyTags;
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
  const { data, error } = await supabase.rpc("log_tasting_v2", toLogTastingArgs(parsed.data));
  const created = data?.[0];
  if (error || !created) {
    return { message: error ? databaseMessage(error) : t.panel.errors.failed, values };
  }

  // The picture was uploaded while the form was filled in; now it has a tasting to belong to.
  const photo = parsed.data.status === "logged" ? readPhoto(values) : null;
  const refused = photo ? await savePhoto(supabase, created.tasting_id, photo) : null;

  // The public pages are cached; this makes the new tasting show up right away.
  refreshArchive();
  if (refused) {
    console.error("[tasting] photo not attached:", refused.code, refused.message);
    // The tasting is saved; its form says what was not, and offers to try again.
    redirect(`/panel/tadim/${created.tasting_id}?foto=hata` as Route);
  }
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

  // After the row, so a tasting that just stopped being a wishlist entry can take tags.
  const tags = await supabase.rpc("set_tasting_tags_v1", {
    p_tasting_id: tastingId,
    p_slugs: parsed.data.flavorTagSlugs,
  });
  // The rest of the edit is saved; say what was not, and show the page as it now is.
  if (tags.error) {
    refreshArchive();
    return { message: databaseMessage(tags.error), values };
  }

  const refused = await savePhoto(
    supabase,
    tastingId,
    parsed.data.status === "logged" ? readPhoto(values) : null,
  );
  if (refused) {
    refreshArchive();
    console.error("[tasting] photo not saved:", refused.code, refused.message);
    return { message: t.photo.errors.failed, values };
  }

  refreshArchive();
  redirect("/panel");
}

export async function deleteTasting(tastingId: string): Promise<void> {
  const { supabase } = await requireUser();
  if (z.uuid().safeParse(tastingId).success) {
    // The row says where its picture is; once the row is gone, so is the file.
    const { data } = await supabase
      .from("tastings")
      .delete()
      .eq("id", tastingId)
      .select("photo_path");
    await removeMedia(
      supabase,
      (data ?? []).map((row) => row.photo_path),
    );
    refreshArchive();
  }
  redirect("/panel");
}
