/**
 * Verified business accounts (Phase 4B): a brand's page as the apps read it (the
 * `brand_pages` view), what a business is in a profile, and what the application and
 * page-editing forms submit. The database checks everything again.
 */
import {
  BUSINESS_DESCRIPTION_MAX_LENGTH,
  CAFE_DISTRICT_MAX_LENGTH,
  CAFE_MAP_URL_MAX_LENGTH,
  MAP_URL_PATTERN,
  VERIFICATION_MESSAGE_MAX_LENGTH,
  WEBSITE_MAX_LENGTH,
  WEBSITE_PATTERN,
} from "@espressoir/core";
import { z } from "zod";

export const brandPageRowSchema = z
  .object({
    brand_id: z.uuid(),
    brand_slug: z.string().min(1),
    brand_name: z.string().min(1),
    description: z.string().nullable(),
    website: z.string().nullable(),
    official_username: z.string().nullable(),
    official_display_name: z.string().nullable(),
  })
  .transform((row) => ({
    id: row.brand_id,
    slug: row.brand_slug,
    name: row.brand_name,
    description: row.description,
    website: row.website,
    /** The member who speaks for the brand, if an admin has verified one. */
    official: row.official_username
      ? { username: row.official_username, displayName: row.official_display_name }
      : null,
  }));

export type BrandPage = z.infer<typeof brandPageRowSchema>;

/** A business a member speaks for, as `profile_overview.official_for` lists it. */
export const officialForSchema = z.object({
  kind: z.enum(["brand", "cafe"]),
  id: z.uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  city_code: z.number().int().nullable(),
});

export const BUSINESS_INPUT_ERRORS = [
  "invalid",
  "messageRequired",
  "messageTooLong",
  "descriptionTooLong",
  "websiteInvalid",
  "districtTooLong",
  "mapUrlInvalid",
] as const;
export type BusinessInputError = (typeof BUSINESS_INPUT_ERRORS)[number];

const code = (error: BusinessInputError) => ({ error });

const website = z
  .string()
  .trim()
  .max(WEBSITE_MAX_LENGTH, code("websiteInvalid"))
  .refine((value) => value === "" || WEBSITE_PATTERN.test(value), code("websiteInvalid"))
  .transform((value) => value || null);

/** "This business is mine": why, and where to check it. */
export const verificationRequestInputSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, code("messageRequired"))
    .max(VERIFICATION_MESSAGE_MAX_LENGTH, code("messageTooLong")),
  website,
});
export type VerificationRequestInput = z.infer<typeof verificationRequestInputSchema>;

/** What an official account changes on its business's page; empty clears a field. */
export const businessPageInputSchema = z.object({
  description: z
    .string()
    .trim()
    .max(BUSINESS_DESCRIPTION_MAX_LENGTH, code("descriptionTooLong"))
    .transform((value) => value || null),
  website,
  /** Cafés only. */
  district: z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(z.string().max(CAFE_DISTRICT_MAX_LENGTH, code("districtTooLong")))
    .transform((value) => value || null),
  mapUrl: z
    .string()
    .trim()
    .max(CAFE_MAP_URL_MAX_LENGTH, code("mapUrlInvalid"))
    .refine((value) => value === "" || MAP_URL_PATTERN.test(value), code("mapUrlInvalid"))
    .transform((value) => value || null),
});
export type BusinessPageInput = z.infer<typeof businessPageInputSchema>;
