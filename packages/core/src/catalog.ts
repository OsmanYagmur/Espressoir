/**
 * The closed value sets of the domain, mirroring the Postgres enums (a database test keeps
 * the two in step). Shared by web, scripts and, later, the mobile app.
 */
export const COFFEE_FORMS = ["whole_bean", "ground", "capsule"] as const;
export type CoffeeForm = (typeof COFFEE_FORMS)[number];

export const CAPSULE_SYSTEMS = ["nespresso_original", "vertuo", "dolce_gusto"] as const;
export type CapsuleSystem = (typeof CAPSULE_SYSTEMS)[number];

export const COFFEE_PROCESSES = [
  "washed",
  "natural",
  "honey",
  "anaerobic",
  "wet_hulled",
  "other",
] as const;
export type CoffeeProcess = (typeof COFFEE_PROCESSES)[number];

export const ROAST_LEVELS = ["light", "medium_light", "medium", "medium_dark", "dark"] as const;
export type RoastLevel = (typeof ROAST_LEVELS)[number];

export const BREW_CATEGORIES = ["espresso", "filter", "immersion", "capsule", "turkish"] as const;
export type BrewCategory = (typeof BREW_CATEGORIES)[number];

export const TASTING_STATUSES = ["logged", "wishlist"] as const;
export type TastingStatus = (typeof TASTING_STATUSES)[number];

export const TASTING_VISIBILITIES = ["public", "followers", "private"] as const;
export type TastingVisibility = (typeof TASTING_VISIBILITIES)[number];

/** Taste profile dimensions, each rated 1 (low) to 5 (high). */
export const TASTE_DIMENSIONS = [
  "body",
  "acidity",
  "bitterness",
  "sweetness",
  "aftertaste",
] as const;
export type TasteDimension = (typeof TASTE_DIMENSIONS)[number];
export const TASTE_MIN = 1;
export const TASTE_MAX = 5;

export const NOTES_MAX_LENGTH = 4000;
export const DEVICE_MAX_LENGTH = 60;
export const BRAND_NAME_MAX_LENGTH = 80;
export const COFFEE_NAME_MAX_LENGTH = 120;
/** Brands print their own strength scales; 20 comfortably covers all of them. */
export const BRAND_INTENSITY_MAX = 20;
