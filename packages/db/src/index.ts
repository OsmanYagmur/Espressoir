import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database, Json } from "./database.types";

/**
 * A Supabase client typed against our schema. Query helpers in this package accept any
 * such client (server, browser, or later React Native), so they stay framework-agnostic.
 */
export type TypedSupabaseClient = SupabaseClient<Database>;

export {
  ARCHIVE_SPLIT_BYTES,
  archiveSize,
  brewMethodRowSchema,
  coffeeRowSchema,
  fetchArchiveRows,
  flavorTagRowSchema,
  parseArchive,
  tastingRowSchema,
  type Archive,
  type ArchiveRows,
  type BrewMethod,
  type Coffee,
  type FlavorTag,
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

export {
  LIST_INPUT_ERRORS,
  listInputSchema,
  listNoteSchema,
  listRowSchema,
  type ListInput,
  type ListInputError,
  type MemberList,
} from "./list";

export {
  CAFE_VISIT_INPUT_ERRORS,
  cafeRowSchema,
  cafeVisitInputSchema,
  cafeVisitRowSchema,
  cafeVisitUpdateSchema,
  toCafeVisitUpdate,
  toLogCafeVisitArgs,
  type Cafe,
  type CafeVisit,
  type CafeVisitInput,
  type CafeVisitInputError,
  type CafeVisitUpdateInput,
} from "./cafe";

export { notificationRowSchema, type Notification } from "./notification";

export {
  COMMENT_SELECT,
  commentRowSchema,
  parseCommentBody,
  threadComments,
  type Comment,
  type CommentInputError,
  type CommentThread,
} from "./comment";
