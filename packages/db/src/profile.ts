/**
 * A member's public profile as the apps consume it (the `profile_overview` view), and what
 * the account forms submit. Framework-free, like the archive read models.
 */
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  normalizeUsername,
  usernameProblem,
} from "@espressoir/core";
import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const count = z.number().int().nonnegative();

export const profileRowSchema = z
  .object({
    user_id: z.uuid(),
    username: z.string().min(1),
    display_name: z.string().nullable(),
    bio: z.string().nullable(),
    avatar_url: z.string().nullable(),
    joined_at: z.string(),
    tasting_count: count,
    rated_count: count,
    // Postgres `numeric` arrives as a JSON number from the API, as text from a raw driver.
    avg_score: z.coerce.number().nullable(),
    coffee_count: count,
    wishlist_count: count,
    last_tasted_at: day.nullable(),
    follower_count: count,
    following_count: count,
  })
  .transform((row) => ({
    id: row.user_id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    joinedAt: row.joined_at,
    stats: {
      tastingCount: row.tasting_count,
      ratedCount: row.rated_count,
      avgScore: row.avg_score,
      coffeeCount: row.coffee_count,
      wishlistCount: row.wishlist_count,
      lastTastedAt: row.last_tasted_at,
      followerCount: row.follower_count,
      followingCount: row.following_count,
    },
  }));

export type Profile = z.infer<typeof profileRowSchema>;

/** Error codes of the account forms; the app translates them. */
export const ACCOUNT_INPUT_ERRORS = [
  "invalid",
  "usernameInvalid",
  "usernameReserved",
  "displayNameTooLong",
  "bioTooLong",
  "termsRequired",
] as const;
export type AccountInputError = (typeof ACCOUNT_INPUT_ERRORS)[number];

const code = (error: AccountInputError) => ({ error });

const username = z
  .string()
  .transform(normalizeUsername)
  .superRefine((value, context) => {
    const problem = usernameProblem(value);
    if (problem) {
      context.addIssue({
        code: "custom",
        message: problem === "reserved" ? "usernameReserved" : "usernameInvalid",
      });
    }
  });

/** Collapses runs of whitespace; an empty result means "not given". */
const oneLine = (max: number, error: AccountInputError) =>
  z
    .string()
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max, code(error)))
    .transform((value) => value || null);

const displayName = oneLine(DISPLAY_NAME_MAX_LENGTH, "displayNameTooLong");

const bio = z
  .string()
  .transform((value) => value.replace(/\r\n?/g, "\n").trim())
  .pipe(z.string().max(BIO_MAX_LENGTH, code("bioTooLong")))
  .transform((value) => value || null);

export const onboardingInputSchema = z.object({
  username,
  displayName,
  acceptTerms: z.literal(true, code("termsRequired")),
});
export type OnboardingInput = z.infer<typeof onboardingInputSchema>;

export const profileInputSchema = z.object({ username, displayName, bio });
export type ProfileInput = z.infer<typeof profileInputSchema>;
