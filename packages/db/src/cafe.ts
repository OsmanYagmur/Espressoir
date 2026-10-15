/**
 * Cafés and visits (Phase 3F). Rows come from the `cafe_overview` and `cafe_visit_feed`
 * views; what a visit form submits is validated once here, the database checks it again.
 */
import {
  CAFE_DISTRICT_MAX_LENGTH,
  CAFE_DRINKS,
  CAFE_DRINK_NAME_MAX_LENGTH,
  CAFE_MAP_URL_MAX_LENGTH,
  CAFE_NAME_MAX_LENGTH,
  CAFE_VISIT_NOTES_MAX_LENGTH,
  MAP_URL_PATTERN,
  SCORE_MAX,
  SCORE_MIN,
  TASTING_VISIBILITIES,
  TR_CITIES,
} from "@espressoir/core";
import { z } from "zod";

import type { Database } from "./database.types";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const cafeRowSchema = z
  .object({
    cafe_id: z.uuid(),
    cafe_slug: z.string().min(1),
    cafe_name: z.string().min(1),
    city_code: z.number().int().min(1).max(TR_CITIES.length),
    district: z.string().nullable(),
    map_url: z.string().nullable(),
    created_at: z.string(),
    is_reviewed: z.boolean(),
    visit_count: z.number().int().nonnegative(),
    // Postgres `numeric` arrives as a JSON number from the API, as text from a raw driver.
    avg_score: z.coerce.number().nullable(),
    last_visited_on: day.nullable(),
    // Absent until the official accounts migration is applied.
    description: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    official_username: z.string().nullable().optional(),
  })
  .transform((row) => ({
    id: row.cafe_id,
    slug: row.cafe_slug,
    name: row.cafe_name,
    cityCode: row.city_code,
    district: row.district,
    mapUrl: row.map_url,
    createdAt: row.created_at,
    isReviewed: row.is_reviewed,
    /** Public, visible visits only, whoever asks. */
    visitCount: row.visit_count,
    avgScore: row.avg_score,
    lastVisitedOn: row.last_visited_on,
    description: row.description ?? null,
    website: row.website ?? null,
    /** The member who speaks for the café, if an admin has verified one. */
    officialUsername: row.official_username ?? null,
  }));

export type Cafe = z.infer<typeof cafeRowSchema>;

export const cafeVisitRowSchema = z
  .object({
    visit_id: z.uuid(),
    drink: z.enum(CAFE_DRINKS),
    drink_name: z.string().nullable(),
    score: z.number().int().min(SCORE_MIN).max(SCORE_MAX),
    notes: z.string().nullable(),
    visited_on: day,
    visibility: z.enum(TASTING_VISIBILITIES),
    created_at: z.string(),
    is_hidden: z.boolean(),
    user_id: z.uuid(),
    username: z.string().min(1),
    display_name: z.string().nullable(),
    cafe_id: z.uuid(),
    cafe_slug: z.string().min(1),
    cafe_name: z.string().min(1),
    city_code: z.number().int().min(1).max(TR_CITIES.length),
    district: z.string().nullable(),
  })
  .transform((row) => ({
    id: row.visit_id,
    drink: row.drink,
    drinkName: row.drink_name,
    score: row.score,
    notes: row.notes,
    visitedOn: row.visited_on,
    visibility: row.visibility,
    createdAt: row.created_at,
    /** Hidden by an admin: only its author (and admins) ever receive such a row. */
    isHidden: row.is_hidden,
    author: { id: row.user_id, username: row.username, displayName: row.display_name },
    cafe: {
      id: row.cafe_id,
      slug: row.cafe_slug,
      name: row.cafe_name,
      cityCode: row.city_code,
      district: row.district,
    },
  }));

export type CafeVisit = z.infer<typeof cafeVisitRowSchema>;

export const CAFE_VISIT_INPUT_ERRORS = [
  "invalid",
  "cafeRequired",
  "cityRequired",
  "nameTooLong",
  "mapUrlInvalid",
  "drinkRequired",
  "scoreRange",
  "dateInvalid",
  "dateFuture",
  "notesTooLong",
  "priceInvalid",
] as const;
export type CafeVisitInputError = (typeof CAFE_VISIT_INPUT_ERRORS)[number];

const code = (error: CafeVisitInputError) => ({ error });
const tidy = (value: string) => value.trim().replace(/\s+/g, " ");
const optionalText = (max: number, error: CafeVisitInputError) =>
  z
    .string()
    .transform(tidy)
    .pipe(z.string().max(max, code(error)))
    .transform((value) => value || null);

const existingCafe = z.object({
  mode: z.literal("existing"),
  cafeId: z.uuid(code("cafeRequired")),
});

const newCafe = z.object({
  mode: z.literal("new"),
  name: z
    .string()
    .transform(tidy)
    .pipe(z.string().min(1, code("cafeRequired")).max(CAFE_NAME_MAX_LENGTH, code("nameTooLong"))),
  cityCode: z
    .number(code("cityRequired"))
    .int(code("cityRequired"))
    .min(1, code("cityRequired"))
    .max(TR_CITIES.length, code("cityRequired")),
  district: optionalText(CAFE_DISTRICT_MAX_LENGTH, "nameTooLong"),
  mapUrl: z
    .string()
    .trim()
    .max(CAFE_MAP_URL_MAX_LENGTH, code("mapUrlInvalid"))
    .refine((value) => value === "" || MAP_URL_PATTERN.test(value), code("mapUrlInvalid"))
    .transform((value) => value || null),
});

const visitFields = z.object({
  drink: z.enum(CAFE_DRINKS, code("drinkRequired")),
  drinkName: optionalText(CAFE_DRINK_NAME_MAX_LENGTH, "nameTooLong"),
  score: z
    .number(code("scoreRange"))
    .int(code("scoreRange"))
    .min(SCORE_MIN, code("scoreRange"))
    .max(SCORE_MAX, code("scoreRange")),
  notes: z
    .string()
    .trim()
    .max(CAFE_VISIT_NOTES_MAX_LENGTH, code("notesTooLong"))
    .transform((value) => value || null),
  visitedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, code("dateInvalid")),
  pricePaid: z
    .number()
    .min(0, code("priceInvalid"))
    .max(99_999_999, code("priceInvalid"))
    .nullable(),
  visibility: z.enum(TASTING_VISIBILITIES),
});

/**
 * @param today "YYYY-MM-DD" in the member's own time zone: a visit cannot be dated later.
 */
export function cafeVisitInputSchema(today: string) {
  return visitFields
    .extend({ cafe: z.discriminatedUnion("mode", [existingCafe, newCafe]) })
    .superRefine((input, context) => {
      if (Number.isNaN(Date.parse(`${input.visitedOn}T00:00:00Z`))) {
        context.addIssue({ code: "custom", path: ["visitedOn"], message: "dateInvalid" });
      } else if (input.visitedOn > today) {
        context.addIssue({ code: "custom", path: ["visitedOn"], message: "dateFuture" });
      }
    });
}

/** Editing a visit: everything but the café, which stays as it is. */
export function cafeVisitUpdateSchema(today: string) {
  return visitFields.superRefine((input, context) => {
    if (Number.isNaN(Date.parse(`${input.visitedOn}T00:00:00Z`))) {
      context.addIssue({ code: "custom", path: ["visitedOn"], message: "dateInvalid" });
    } else if (input.visitedOn > today) {
      context.addIssue({ code: "custom", path: ["visitedOn"], message: "dateFuture" });
    }
  });
}

export type CafeVisitInput = z.infer<ReturnType<typeof cafeVisitInputSchema>>;
export type CafeVisitUpdateInput = z.infer<ReturnType<typeof cafeVisitUpdateSchema>>;

type LogCafeVisitArgs = Database["public"]["Functions"]["log_cafe_visit_v1"]["Args"];
type CafeVisitUpdate = Database["public"]["Tables"]["cafe_visits"]["Update"];

const orUndefined = <T>(value: T | null): T | undefined => value ?? undefined;

/** Arguments for the `log_cafe_visit_v1` RPC. Omitted arguments fall back to SQL defaults. */
export function toLogCafeVisitArgs(input: CafeVisitInput): LogCafeVisitArgs {
  const cafe =
    input.cafe.mode === "existing"
      ? { p_cafe_id: input.cafe.cafeId }
      : {
          p_cafe_name: input.cafe.name,
          p_city_code: input.cafe.cityCode,
          p_district: orUndefined(input.cafe.district),
          p_map_url: orUndefined(input.cafe.mapUrl),
        };
  return {
    ...cafe,
    p_drink: input.drink,
    p_drink_name: orUndefined(input.drinkName),
    p_score: input.score,
    p_notes: orUndefined(input.notes),
    p_visited_on: input.visitedOn,
    p_price_paid: orUndefined(input.pricePaid),
    p_visibility: input.visibility,
  };
}

/** Column values for editing a visit. */
export function toCafeVisitUpdate(input: CafeVisitUpdateInput): CafeVisitUpdate {
  return {
    drink: input.drink,
    drink_name: input.drinkName,
    score: input.score,
    notes: input.notes,
    visited_on: input.visitedOn,
    price_paid: input.pricePaid,
    visibility: input.visibility,
  };
}
