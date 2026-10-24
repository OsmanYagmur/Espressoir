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
  BUSINESS_INPUT_ERRORS,
  brandPageRowSchema,
  businessPageInputSchema,
  verificationRequestInputSchema,
  type BrandPage,
  type BusinessInputError,
  type BusinessPageInput,
  type VerificationRequestInput,
} from "./business";

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
  WORKSHOP_APPLICATION_ERRORS,
  WORKSHOP_APPLICATION_SELECT,
  WORKSHOP_APPLICATION_SELECTS,
  WORKSHOP_INPUT_ERRORS,
  WORKSHOP_RSVP_ERRORS,
  RSVP_TOKEN_PATTERN,
  adminApplicationInputSchema,
  answerWorkshopRsvp,
  communityStatSchema,
  fetchWorkshopRows,
  readWorkshopRsvp,
  toAdminApplicationInsert,
  toWorkshopApplicationInsert,
  toWorkshopRow,
  workshopApplicationInputSchema,
  workshopApplicationRowSchema,
  workshopInputSchema,
  workshopRowSchema,
  workshopRsvpSchema,
  zonedTimeToIso,
  type AdminApplicationInput,
  type CommunityStat,
  type Workshop,
  type WorkshopApplication,
  type WorkshopApplicationError,
  type WorkshopApplicationInput,
  type WorkshopInput,
  type WorkshopInputError,
  type WorkshopRsvp,
  type WorkshopRsvpError,
} from "./workshop";

export {
  COMMENT_SELECT,
  commentRowSchema,
  parseCommentBody,
  threadComments,
  type Comment,
  type CommentInputError,
  type CommentThread,
} from "./comment";

export * from "./selectors";
export * from "./suggestions";

export {
  SocialFailure,
  addComment,
  countUnreadNotifications,
  createList,
  deleteList,
  deleteTasting,
  editComment,
  feedCursorOf,
  fileReport,
  isFollowing,
  loadCoffeeShelf,
  loadComments,
  loadFeedPage,
  loadLikes,
  loadMemberLists,
  loadNotifications,
  loadOwnTastings,
  loadTasting,
  markNotificationsRead,
  removeComment,
  setFollowing,
  setListItem,
  setLiked,
  setWantToTry,
  socialErrorKind,
  type CoffeeShelf,
  type FeedCursor,
  type FeedSource,
  type ShelfList,
  type SocialError,
} from "./social";
