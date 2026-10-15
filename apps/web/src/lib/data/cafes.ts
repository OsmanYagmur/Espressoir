/**
 * Cafés on the website: places in words, links, cards. The pure views (find, visits by
 * café or member) are in @espressoir/db. Only public, visible visits are in the archive,
 * so every number here is a public one.
 */
import {
  cityByCode,
  foldTurkish,
  summarizeBy,
  type CafeDrink,
  type GroupSummary,
} from "@espressoir/core";
import {
  byVisitDay,
  findCafe,
  latestVisits,
  visitsAt,
  visitsBy,
  type Cafe,
  type CafeVisit,
} from "@espressoir/db";
import type { Route } from "next";

import { formatDay } from "@/lib/format";
import { t } from "@/lib/i18n";
import { cafePath } from "@/lib/routes";

// The pure views are shared with the mobile app; re-exported so pages import from one place.
export { byVisitDay, findCafe, latestVisits, visitsAt, visitsBy };

export function cityName(code: number): string {
  return cityByCode(code)?.name ?? "";
}

/** Where a café is, in words: "Kadıköy, İstanbul" (or just the city). */
export function placeOf(cafe: Pick<Cafe, "cityCode" | "district">): string {
  return [cafe.district, cityName(cafe.cityCode)].filter(Boolean).join(", ");
}

export function cafeHref(cafe: Pick<Cafe, "cityCode" | "slug">): Route {
  return cafePath(cityByCode(cafe.cityCode)?.slug ?? "-", cafe.slug);
}

/** The average score per kind of drink, best first, each with its n. */
export function drinkMeans(visits: readonly CafeVisit[]): (GroupSummary & { label: string })[] {
  return summarizeBy(
    visits,
    (visit) => visit.drink,
    (visit) => visit.score,
  ).map((group) => ({ ...group, label: t.cafes.drinks[group.key as CafeDrink] }));
}

/**
 * A café as the list shows it. Display strings are prepared on the server, so the list
 * renders the same in the browser (no locale-dependent formatting on the client).
 */
export interface CafeCard {
  id: string;
  name: string;
  href: Route;
  citySlug: string;
  place: string;
  isReviewed: boolean;
  visitCount: number;
  avgScore: number | null;
  lastVisitLabel: string | null;
  /** Folded name, district and city, for the search box. */
  searchText: string;
}

/** Most visited first, then by name. */
export function toCafeCards(cafes: readonly Cafe[]): CafeCard[] {
  return [...cafes]
    .sort((a, b) => b.visitCount - a.visitCount || a.name.localeCompare(b.name, "tr"))
    .map((cafe) => ({
      id: cafe.id,
      name: cafe.name,
      href: cafeHref(cafe),
      citySlug: cityByCode(cafe.cityCode)?.slug ?? "",
      place: placeOf(cafe),
      isReviewed: cafe.isReviewed,
      visitCount: cafe.visitCount,
      avgScore: cafe.avgScore,
      lastVisitLabel: cafe.lastVisitedOn ? formatDay(cafe.lastVisitedOn) : null,
      searchText: foldTurkish(`${cafe.name} ${placeOf(cafe)}`),
    }));
}
