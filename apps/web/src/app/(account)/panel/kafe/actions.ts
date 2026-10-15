"use server";

import {
  CAFE_VISITS_PER_DAY,
  CAFE_VISIT_NOTES_MAX_LENGTH,
  CAFES_PER_DAY,
  cityByCode,
  siteConfig,
} from "@espressoir/core";
import {
  CAFE_VISIT_INPUT_ERRORS,
  cafeVisitInputSchema,
  cafeVisitUpdateSchema,
  toCafeVisitUpdate,
  toLogCafeVisitArgs,
  type CafeVisitInputError,
} from "@espressoir/db";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { refreshArchive } from "@/lib/data/refresh-archive";
import { format, t } from "@/lib/i18n";
import { cafePath } from "@/lib/routes";

const e = t.cafes.errors;

export interface CafeVisitFormState {
  /** Field name → message, for the fields that need fixing. */
  errors?: Record<string, string>;
  message?: string;
  /** What was submitted, so the form can show it again instead of going blank. */
  values?: Record<string, string>;
}

/** "Today" where the archive lives; a visit cannot be dated after it. */
function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: siteConfig.timeZone }).format(new Date());
}

function readValues(formData: FormData) {
  const values: Record<string, string> = {};
  for (const [name, value] of formData.entries()) {
    if (typeof value === "string" && !name.startsWith("$")) values[name] = value;
  }
  const text = (name: string) => (values[name] ?? "").trim();
  const number = (name: string) =>
    text(name) === "" ? null : Number(text(name).replace(",", "."));
  const fields = {
    drink: text("drink"),
    drinkName: text("drinkName"),
    score: number("score"),
    notes: text("notes"),
    visitedOn: text("visitedOn") || today(),
    pricePaid: number("pricePaid"),
    visibility: text("visibility") || "public",
  };
  const cafe =
    text("cafeMode") === "new"
      ? {
          mode: "new",
          name: text("cafeName"),
          cityCode: number("cityCode"),
          district: text("district"),
          mapUrl: text("mapUrl"),
        }
      : { mode: "existing", cafeId: text("cafeId") };
  return { values, fields, cafe };
}

function errorText(code: string): string {
  const known = CAFE_VISIT_INPUT_ERRORS.find((error) => error === code) as
    CafeVisitInputError | undefined;
  if (known === "notesTooLong") return format(e.notesTooLong, { max: CAFE_VISIT_NOTES_MAX_LENGTH });
  return e[known ?? "invalid"];
}

function validationState(error: z.ZodError, values: Record<string, string>): CafeVisitFormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    // "cafe.cityCode" → "cityCode": the form's own field names.
    const field = String(issue.path.at(-1) ?? "form");
    errors[field] ??= errorText(issue.message);
  }
  return { errors, message: e.invalid, values };
}

/** Turns a database refusal into something a person can act on. */
function databaseMessage(error: { code?: string; message: string }): string {
  if (error.message.includes("rate_limited")) {
    return format(e.rateLimited, { cafes: CAFES_PER_DAY, visits: CAFE_VISITS_PER_DAY });
  }
  if (error.message.includes("cafes_map_url_format")) return e.mapUrlInvalid;
  if (error.message.includes("cafe_required")) return e.cafeRequired;
  if (error.code === "42501" || error.message.includes("row-level security")) return e.notAllowed;
  if (error.message.includes("not_authenticated")) return e.sessionExpired;
  return e.failed;
}

export async function createCafeVisit(
  _previous: CafeVisitFormState,
  formData: FormData,
): Promise<CafeVisitFormState> {
  const { supabase } = await requireUser();
  const { values, fields, cafe } = readValues(formData);
  const parsed = cafeVisitInputSchema(today()).safeParse({ ...fields, cafe });
  if (!parsed.success) return validationState(parsed.error, values);

  // One call, one transaction: the café is created only if it is new.
  const { data, error } = await supabase.rpc("log_cafe_visit_v1", toLogCafeVisitArgs(parsed.data));
  const created = data?.[0];
  if (error || !created) {
    return { message: error ? databaseMessage(error) : e.failed, values };
  }

  // The public pages are cached; this makes the visit show up right away.
  refreshArchive();
  redirect(cafePath(cityByCode(created.city_code)?.slug ?? "-", created.cafe_slug));
}

export async function updateCafeVisit(
  visitId: string,
  _previous: CafeVisitFormState,
  formData: FormData,
): Promise<CafeVisitFormState> {
  const { supabase } = await requireUser();
  const { values, fields } = readValues(formData);
  const parsed = cafeVisitUpdateSchema(today()).safeParse(fields);
  if (!parsed.success) return validationState(parsed.error, values);
  if (!z.uuid().safeParse(visitId).success) return { message: t.cafes.panel.notFound, values };

  // Row level security limits this to the member's own visit; no row back means it was
  // not theirs (or no longer exists).
  const { data, error } = await supabase
    .from("cafe_visits")
    .update(toCafeVisitUpdate(parsed.data))
    .eq("id", visitId)
    .select("id");
  if (error) return { message: databaseMessage(error), values };
  if (!data || data.length === 0) return { message: t.cafes.panel.notFound, values };

  refreshArchive();
  redirect("/panel");
}

export async function deleteCafeVisit(visitId: string): Promise<void> {
  const { supabase } = await requireUser();
  if (z.uuid().safeParse(visitId).success) {
    await supabase.from("cafe_visits").delete().eq("id", visitId);
    refreshArchive();
  }
  redirect("/panel");
}
