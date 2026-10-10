import type { CoffeeListItem } from "@espressoir/core";
import type { BrewMethod } from "@espressoir/db";
import type { Route } from "next";

import { countryName, formatDay } from "@/lib/format";
import { coffeePath } from "@/lib/routes";

/**
 * A coffee as a list shows it. Display strings are prepared on the server so the list
 * renders identically in the browser (no locale-dependent formatting on the client).
 */
export interface CoffeeCard extends CoffeeListItem {
  href: Route;
  originLabel: string | null;
  lastTastedLabel: string | null;
  methodLabels: string[];
}

export function toCoffeeCards(
  items: readonly CoffeeListItem[],
  brewMethods: readonly BrewMethod[],
): CoffeeCard[] {
  const methodNames = new Map(brewMethods.map((method) => [method.slug, method.name]));
  return items.map((item) => ({
    ...item,
    href: coffeePath(item.brandSlug, item.slug),
    originLabel: item.originCountry ? countryName(item.originCountry) : null,
    lastTastedLabel: item.lastTastedAt ? formatDay(item.lastTastedAt) : null,
    methodLabels: item.brewMethodSlugs.map((slug) => methodNames.get(slug) ?? slug),
  }));
}
