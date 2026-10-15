import { CAFE_VISITS_PER_DAY, CAFES_PER_DAY } from "@espressoir/core";

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
