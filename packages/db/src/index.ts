import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database, Json } from "./database.types";

/**
 * A Supabase client typed against our schema. Query helpers in this package accept any
 * such client (server, browser, or later React Native), so they stay framework-agnostic.
 */
export type TypedSupabaseClient = SupabaseClient<Database>;

export {
  brewMethodRowSchema,
  coffeeRowSchema,
  fetchArchiveRows,
  parseArchive,
  tastingRowSchema,
  type Archive,
  type ArchiveRows,
  type BrewMethod,
  type Coffee,
  type Tasting,
} from "./archive";

export {
  TASTING_INPUT_ERRORS,
  tastingInputSchema,
  toLogTastingArgs,
  toTastingUpdate,
  type TastingInput,
  type TastingInputError,
} from "./tasting-input";

export {
  ACCOUNT_INPUT_ERRORS,
  onboardingInputSchema,
  profileInputSchema,
  profileRowSchema,
  type AccountInputError,
  type OnboardingInput,
  type Profile,
  type ProfileInput,
} from "./profile";
