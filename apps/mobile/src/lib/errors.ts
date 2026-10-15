import {
  CAFE_VISITS_PER_DAY,
  CAFES_PER_DAY,
  LIST_ITEMS_MAX,
  LISTS_PER_MEMBER_MAX,
} from "@espressoir/core";
import { SocialFailure } from "@espressoir/db";

import { format, t } from "./i18n";

/** A database refusal of a tasting, in words (the website's form says the same). */
export function tastingErrorText(error: { code?: string; message: string }): string {
  const e = t.panel.errors;
  if (error.message.includes("rate_limited")) return e.rateLimited;
  if (error.message.includes("official_cannot_score")) return e.officialCannotScore;
  if (error.message.includes("tastings_one_wishlist_per_coffee_key")) return e.wishlistDuplicate;
  if (error.code === "42501" || error.message.includes("row-level security")) return e.notAllowed;
  if (error.message.includes("not_authenticated")) return e.sessionExpired;
  if (error.message.includes("coffee_required")) return e.coffeeRequired;
  return e.failed;
}

/** A database refusal of a café visit, in words. */
export function visitErrorText(error: { code?: string; message: string }): string {
  const e = t.cafes.errors;
  if (error.message.includes("rate_limited")) {
    return format(e.rateLimited, { cafes: CAFES_PER_DAY, visits: CAFE_VISITS_PER_DAY });
  }
  if (error.message.includes("official_cannot_score")) return e.officialCannotScore;
  if (error.message.includes("cafes_map_url_format")) return e.mapUrlInvalid;
  if (error.message.includes("cafe_required")) return e.cafeRequired;
  if (error.code === "42501" || error.message.includes("row-level security")) return e.notAllowed;
  if (error.message.includes("not_authenticated")) return e.sessionExpired;
  return e.failed;
}

/** A refusal of a comment, like or report (a `SocialFailure` from `@espressoir/db`). */
export function socialErrorText(failure: unknown): string {
  const e = t.social.errors;
  const kind = failure instanceof SocialFailure ? failure.kind : "failed";
  if (kind === "rateLimited") return e.rateLimited;
  if (kind === "restricted") return e.restricted;
  if (kind === "parentGone") return e.parentGone;
  return e.failed;
}

/** A refusal of a follow. */
export function followErrorText(failure: unknown): string {
  const f = t.follow;
  const kind = failure instanceof SocialFailure ? failure.kind : "failed";
  if (kind === "rateLimited") return f.rateLimited;
  if (kind === "restricted") return f.restricted;
  return f.failed;
}

/** A refusal of a list change or of "want to try" (the website's coffee page says the same). */
export function shelfErrorText(failure: unknown): string {
  const l = t.lists;
  const kind = failure instanceof SocialFailure ? failure.kind : "failed";
  if (kind === "rateLimited") return l.add.rateLimited;
  if (kind === "tooManyLists") return format(l.add.tooMany, { max: LISTS_PER_MEMBER_MAX });
  if (kind === "listFull") return format(l.add.full, { max: LIST_ITEMS_MAX });
  if (kind === "duplicate") return l.errors.duplicate;
  if (kind === "restricted") return l.add.restricted;
  return l.errors.failed;
}
