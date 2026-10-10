import { foldTurkish } from "./fold-turkish";

const MAX_SLUG_LENGTH = 80;

/**
 * URL slug with Turkish-aware folding: "Ristretto (Siyah Kapsül)" → "ristretto-siyah-kapsul".
 * Apostrophes are dropped so "Jacob's" and "Jacobs" share a slug.
 * Returns an empty string when nothing slug-worthy remains; callers decide the fallback.
 */
export function slugify(input: string): string {
  return foldTurkish(input)
    .replace(/['’‘`´]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, "");
}
