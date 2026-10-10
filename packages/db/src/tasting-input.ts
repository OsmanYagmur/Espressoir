/**
 * What a "log a tasting" form submits, validated once here for every client. The database
 * enforces the same limits again (constraints, RLS); this layer exists to give people a
 * precise message before a round trip. Error messages are codes, translated by the app.
 */
import {
  BRAND_INTENSITY_MAX,
  BRAND_NAME_MAX_LENGTH,
  CAPSULE_SYSTEMS,
  COFFEE_FORMS,
  COFFEE_NAME_MAX_LENGTH,
  DEVICE_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  SCORE_MAX,
  SCORE_MIN,
  TASTE_MAX,
  TASTE_MIN,
  TASTING_STATUSES,
  TASTING_VISIBILITIES,
} from "@espressoir/core";
import { z } from "zod";

import type { Database } from "./database.types";

export const TASTING_INPUT_ERRORS = [
  "invalid",
  "coffeeRequired",
  "nameTooLong",
  "scoreRange",
  "dateInvalid",
  "dateFuture",
  "notesTooLong",
  "priceInvalid",
] as const;
export type TastingInputError = (typeof TASTING_INPUT_ERRORS)[number];

const code = (error: TastingInputError) => ({ error });

const taste = z.number().int().min(TASTE_MIN).max(TASTE_MAX).nullable();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, code("dateInvalid"));

const existingCoffee = z.object({
  mode: z.literal("existing"),
  coffeeId: z.uuid(code("coffeeRequired")),
});

const newCoffee = z.object({
  mode: z.literal("new"),
  brandName: z
    .string()
    .trim()
    .min(1, code("coffeeRequired"))
    .max(BRAND_NAME_MAX_LENGTH, code("nameTooLong")),
  coffeeName: z
    .string()
    .trim()
    .min(1, code("coffeeRequired"))
    .max(COFFEE_NAME_MAX_LENGTH, code("nameTooLong")),
  form: z.enum(COFFEE_FORMS).nullable(),
  capsuleSystem: z.enum(CAPSULE_SYSTEMS).nullable(),
  brandIntensity: z.number().int().min(1).max(BRAND_INTENSITY_MAX).nullable(),
  originCountry: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .nullable(),
});

const tastingFields = z.object({
  status: z.enum(TASTING_STATUSES),
  visibility: z.enum(TASTING_VISIBILITIES),
  brewMethodSlug: z.string().min(1).nullable(),
  device: z.string().trim().max(DEVICE_MAX_LENGTH).nullable(),
  score: z
    .number()
    .int()
    .min(SCORE_MIN, code("scoreRange"))
    .max(SCORE_MAX, code("scoreRange"))
    .nullable(),
  tastedAt: day.nullable(),
  notes: z.string().trim().max(NOTES_MAX_LENGTH, code("notesTooLong")).nullable(),
  body: taste,
  acidity: taste,
  bitterness: taste,
  sweetness: taste,
  aftertaste: taste,
  wouldBuyAgain: z.boolean().nullable(),
  pricePaid: z
    .number()
    .min(0, code("priceInvalid"))
    .max(99_999_999, code("priceInvalid"))
    .nullable(),
});

/** Empty strings from text inputs mean "not given". */
const blankToNull = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).map(([key, field]) => [key, field === "" ? null : field]),
  ) as T;

/**
 * @param today "YYYY-MM-DD" in the user's own time zone: a tasting cannot be dated later.
 */
export function tastingInputSchema(today: string) {
  return tastingFields
    .extend({ coffee: z.discriminatedUnion("mode", [existingCoffee, newCoffee]) })
    .transform((input) => {
      const cleaned = blankToNull(input);
      // A wishlist entry has not been tasted: it carries no score and no date.
      if (cleaned.status === "wishlist") return { ...cleaned, score: null, tastedAt: null };
      return cleaned;
    })
    .superRefine((input, context) => {
      if (input.tastedAt && input.tastedAt > today) {
        context.addIssue({ code: "custom", path: ["tastedAt"], message: "dateFuture" });
      }
      if (input.tastedAt && Number.isNaN(Date.parse(`${input.tastedAt}T00:00:00Z`))) {
        context.addIssue({ code: "custom", path: ["tastedAt"], message: "dateInvalid" });
      }
    })
    .transform((input) => {
      if (input.coffee.mode !== "new") return input;
      // The capsule system only makes sense for capsules.
      const capsuleSystem = input.coffee.form === "capsule" ? input.coffee.capsuleSystem : null;
      return { ...input, coffee: { ...input.coffee, capsuleSystem } };
    });
}

export type TastingInput = z.infer<ReturnType<typeof tastingInputSchema>>;

type LogTastingArgs = Database["public"]["Functions"]["log_tasting_v1"]["Args"];
type TastingUpdate = Database["public"]["Tables"]["tastings"]["Update"];

const orUndefined = <T>(value: T | null): T | undefined => value ?? undefined;

/** Arguments for the `log_tasting_v1` RPC. Omitted arguments fall back to SQL defaults (null). */
export function toLogTastingArgs(input: TastingInput): LogTastingArgs {
  const coffee =
    input.coffee.mode === "existing"
      ? { p_coffee_id: input.coffee.coffeeId }
      : {
          p_brand_name: input.coffee.brandName,
          p_coffee_name: input.coffee.coffeeName,
          p_form: orUndefined(input.coffee.form),
          p_capsule_system: orUndefined(input.coffee.capsuleSystem),
          p_brand_intensity: orUndefined(input.coffee.brandIntensity),
          p_origin_country: orUndefined(input.coffee.originCountry),
        };
  return {
    ...coffee,
    p_status: input.status,
    p_visibility: input.visibility,
    p_brew_method_slug: orUndefined(input.brewMethodSlug),
    p_device: orUndefined(input.device),
    p_score: orUndefined(input.score),
    p_tasted_at: orUndefined(input.tastedAt),
    p_notes: orUndefined(input.notes),
    p_body: orUndefined(input.body),
    p_acidity: orUndefined(input.acidity),
    p_bitterness: orUndefined(input.bitterness),
    p_sweetness: orUndefined(input.sweetness),
    p_aftertaste: orUndefined(input.aftertaste),
    p_would_buy_again: orUndefined(input.wouldBuyAgain),
    p_price_paid: orUndefined(input.pricePaid),
  };
}

/** Column values for editing an existing tasting (its coffee stays as it is). */
export function toTastingUpdate(input: TastingInput, brewMethodId: string | null): TastingUpdate {
  return {
    status: input.status,
    visibility: input.visibility,
    brew_method_id: brewMethodId,
    device: input.device,
    score: input.score,
    tasted_at: input.tastedAt,
    notes: input.notes,
    body: input.body,
    acidity: input.acidity,
    bitterness: input.bitterness,
    sweetness: input.sweetness,
    aftertaste: input.aftertaste,
    would_buy_again: input.wouldBuyAgain,
    price_paid: input.pricePaid,
  };
}
