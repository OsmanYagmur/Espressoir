/**
 * Everything the importer "knows" beyond the file itself, in one reviewable place.
 * Nothing here is guessed at run time: a value the rules do not cover stays empty and is
 * listed in the report.
 */

/** Column names of the Notion "Coffee Tasting" database. */
export const COLUMNS = {
  brand: "Brand/Producer",
  name: "Origin/All Name",
  form: "Status",
  intensity: "Intensity",
  method: "Select",
  score: "Score",
  date: "Date",
  notes: "Notes",
} as const;

/** Spellings confirmed to be the same brand (PROJECT_BRIEF §2): as written → canonical name. */
export const BRAND_ALIASES: Readonly<Record<string, string>> = {
  Starbuck: "Starbucks",
  "Jacob's": "Jacobs",
};

/** Confirmed typos in coffee names: as written → corrected. */
export const COFFEE_NAME_FIXES: Readonly<Record<string, string>> = {
  "Papua New Guine": "Papua New Guinea",
};

/** Possible typos in coffee names. Only listed in the report, never applied. */
export const COFFEE_NAME_SUGGESTIONS: Readonly<Record<string, string>> = {
  "Creamy Vanilia": "Creamy Vanilla",
  "Rich Aroma Vivio&Spicy": "Rich Aroma Vivid&Spicy",
};

export const FORMS: Readonly<Record<string, "ground" | "capsule" | "whole_bean">> = {
  Milled: "ground",
  Capsule: "capsule",
  Core: "whole_bean",
};

/** Notion's "Select" column → brew method slug (+ the device, when the value names one). */
export const BREW_METHODS: Readonly<Record<string, { slug: string; device?: string }>> = {
  V60: { slug: "v60" },
  "Nespresso C30": { slug: "kapsul-makinesi", device: "Nespresso C30" },
  "Filter Coffee Machine": { slug: "filtre-kahve-makinesi" },
  "Wacaco NS2": { slug: "tasinabilir-espresso", device: "Wacaco NS2" },
};

/** Both machines take Nespresso Original capsules only, so a capsule brewed in one is that system. */
export const DEVICE_CAPSULE_SYSTEMS: Readonly<Record<string, "nespresso_original">> = {
  "Nespresso C30": "nespresso_original",
  "Wacaco NS2": "nespresso_original",
};

/**
 * Coffee-growing countries (ISO 3166-1 alpha-2) and the words that name them in a product
 * title. A name sets the origin only when exactly one country is mentioned.
 */
export const ORIGIN_TERMS: Readonly<Record<string, readonly string[]>> = {
  BR: ["brazil", "brazilian", "brasil", "brezilya"],
  BI: ["burundi"],
  CO: ["colombia", "colombian", "kolombiya"],
  CR: ["costa rica", "kosta rika"],
  CU: ["cuba", "kuba"],
  ET: ["ethiopia", "ethiopian", "etiyopya"],
  GT: ["guatemala"],
  HN: ["honduras"],
  ID: ["indonesia", "endonezya"],
  IN: ["india", "hindistan"],
  JM: ["jamaica", "jamaika"],
  KE: ["kenya"],
  MX: ["mexico", "meksika"],
  NI: ["nicaragua", "nikaragua"],
  PA: ["panama"],
  PE: ["peru"],
  PG: ["papua new guinea", "papua yeni gine"],
  RW: ["rwanda", "ruanda"],
  SV: ["el salvador"],
  TZ: ["tanzania", "tanzanya"],
  UG: ["uganda"],
  VN: ["vietnam"],
  YE: ["yemen"],
};

/**
 * Proofreading suggestions for tasting notes. Notes are imported exactly as written; these
 * only produce a "before → after" list in the report for the owner to accept or ignore.
 * Each pattern matches whole words (Turkish letters included).
 */
export const NOTE_SUGGESTIONS: ReadonlyArray<readonly [pattern: string, replacement: string]> = [
  ["bi", "bir"],
  ["bişey", "bir şey"],
  ["tad", "tat"],
  ["gaywt", "gayet"],
  ["yuymuşak", "yumuşak"],
  ["yumuşal", "yumuşak"],
  ["olmasınında", "olmasının da"],
];
