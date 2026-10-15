/**
 * Rules for usernames and profile text. Postgres is the authority (constraints, the
 * onboarding function, the username trigger); these copies let a form answer before a
 * round trip, and a database test keeps the two in step.
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 24;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
export const DISPLAY_NAME_MAX_LENGTH = 60;
export const BIO_MAX_LENGTH = 500;

/** A username is an address (/u/<name>): this many days must pass between two changes. */
export const USERNAME_CHANGE_DAYS = 30;

/** Which text a new member accepts. Change it whenever the terms or the privacy notice do. */
export const TERMS_VERSION = "2026-10-taslak-3";

/** Names that would pass for a page of the site or for the site itself. */
export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "akis",
  "anonim",
  "anonymous",
  "api",
  "auth",
  "ayarlar",
  "cikis",
  "destek",
  "espressoir",
  "giris",
  "gizlilik",
  "hakkinda",
  "hesap",
  "istatistik",
  "kahve",
  "kahveler",
  "kayit",
  "kosullar",
  "kullanici",
  "kvkk",
  "login",
  "marka",
  "markalar",
  "mod",
  "moderator",
  "null",
  "official",
  "panel",
  "resmi",
  "root",
  "settings",
  "signup",
  "support",
  "system",
  "tadim",
  "undefined",
  "yardim",
  "yonetim",
] as const;

/** What people type ("  Ada_Lovelace ") as the database will store it. */
export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export type UsernameProblem = "invalid" | "reserved";

/** Why a (normalized) username cannot be used, or null when its shape is fine. */
export function usernameProblem(username: string): UsernameProblem | null {
  if (!USERNAME_PATTERN.test(username)) return "invalid";
  if ((RESERVED_USERNAMES as readonly string[]).includes(username)) return "reserved";
  return null;
}

/** Placeholder names given at signup ("u_" + 16 hex digits) until onboarding picks a real one. */
export function isPlaceholderUsername(username: string): boolean {
  return /^u_[0-9a-f]{16}$/.test(username);
}
