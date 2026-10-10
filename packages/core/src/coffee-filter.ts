import type { CoffeeForm } from "./catalog";
import { foldTurkish } from "./text/fold-turkish";

/** What a coffee list needs to know about one coffee. */
export interface CoffeeListItem {
  id: string;
  slug: string;
  name: string;
  brandSlug: string;
  brandName: string;
  form: CoffeeForm | null;
  brandIntensity: number | null;
  originCountry: string | null;
  avgScore: number | null;
  ratedCount: number;
  tastingCount: number;
  lastTastedAt: string | null;
  /** Calendar years in which the coffee was tasted. */
  tastedYears: readonly number[];
  brewMethodSlugs: readonly string[];
  /** On the "to try" list and not tasted yet. */
  wishlisted: boolean;
}

export const COFFEE_SORTS = ["recent", "score_desc", "score_asc", "name", "brand"] as const;
export type CoffeeSort = (typeof COFFEE_SORTS)[number];

export interface CoffeeFilter {
  query: string;
  brand: string | null;
  form: CoffeeForm | null;
  method: string | null;
  minScore: number | null;
  maxScore: number | null;
  year: number | null;
  sort: CoffeeSort;
}

export const DEFAULT_COFFEE_FILTER: CoffeeFilter = {
  query: "",
  brand: null,
  form: null,
  method: null,
  minScore: null,
  maxScore: null,
  year: null,
  sort: "recent",
};

/** Nulls always sort last, whichever direction the values go. */
function compareNullable<T>(a: T | null, b: T | null, compare: (x: T, y: T) => number): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return compare(a, b);
}

const byName = (a: CoffeeListItem, b: CoffeeListItem) =>
  a.name.localeCompare(b.name, "tr") || a.brandName.localeCompare(b.brandName, "tr");

const SORTERS: Record<CoffeeSort, (a: CoffeeListItem, b: CoffeeListItem) => number> = {
  recent: (a, b) =>
    compareNullable(a.lastTastedAt, b.lastTastedAt, (x, y) => y.localeCompare(x)) ||
    compareNullable(a.avgScore, b.avgScore, (x, y) => y - x) ||
    byName(a, b),
  score_desc: (a, b) =>
    compareNullable(a.avgScore, b.avgScore, (x, y) => y - x) || SORTERS.recent(a, b),
  score_asc: (a, b) =>
    compareNullable(a.avgScore, b.avgScore, (x, y) => x - y) || SORTERS.recent(a, b),
  name: byName,
  brand: (a, b) => a.brandName.localeCompare(b.brandName, "tr") || byName(a, b),
};

/** Filters and sorts a coffee list. Search ignores case, accents and Turkish letter forms. */
export function filterCoffees(
  items: readonly CoffeeListItem[],
  filter: CoffeeFilter,
): CoffeeListItem[] {
  const words = foldTurkish(filter.query).split(/\s+/).filter(Boolean);
  const byScore = filter.minScore !== null || filter.maxScore !== null;

  return items
    .filter((item) => {
      if (filter.brand && item.brandSlug !== filter.brand) return false;
      if (filter.form && item.form !== filter.form) return false;
      if (filter.method && !item.brewMethodSlugs.includes(filter.method)) return false;
      if (filter.year && !item.tastedYears.includes(filter.year)) return false;
      if (byScore) {
        if (item.avgScore === null) return false;
        if (filter.minScore !== null && item.avgScore < filter.minScore) return false;
        if (filter.maxScore !== null && item.avgScore > filter.maxScore) return false;
      }
      if (words.length > 0) {
        const haystack = foldTurkish(`${item.brandName} ${item.name}`);
        if (!words.every((word) => haystack.includes(word))) return false;
      }
      return true;
    })
    .sort(SORTERS[filter.sort]);
}

/** How many of the filter's fields differ from "show everything". */
export function activeFilterCount(filter: CoffeeFilter): number {
  return [
    filter.query.trim() !== "",
    filter.brand !== null,
    filter.form !== null,
    filter.method !== null,
    filter.minScore !== null || filter.maxScore !== null,
    filter.year !== null,
  ].filter(Boolean).length;
}
