import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  DEFAULT_COFFEE_FILTER,
  filterCoffees,
  type CoffeeFilter,
  type CoffeeListItem,
} from "./coffee-filter";

const coffee = (item: Partial<CoffeeListItem> & { name: string }): CoffeeListItem => ({
  id: item.name,
  slug: item.name.toLowerCase(),
  brandSlug: "nespresso",
  brandName: "Nespresso",
  form: "capsule",
  brandIntensity: null,
  originCountry: null,
  avgScore: null,
  ratedCount: 0,
  tastingCount: 0,
  lastTastedAt: null,
  tastedYears: [],
  brewMethodSlugs: [],
  wishlisted: false,
  ...item,
});

const items = [
  coffee({
    name: "İstanbul Espresso",
    avgScore: 7,
    lastTastedAt: "2025-07-07",
    tastedYears: [2025],
    brewMethodSlugs: ["kapsul-makinesi"],
  }),
  coffee({
    name: "Ristretto",
    avgScore: 9,
    lastTastedAt: "2025-07-07",
    tastedYears: [2025],
    brewMethodSlugs: ["kapsul-makinesi"],
  }),
  coffee({
    name: "Privat Kaffee African Blue",
    brandSlug: "tchibo",
    brandName: "Tchibo",
    form: "whole_bean",
    avgScore: 8,
    lastTastedAt: "2024-03-15",
    tastedYears: [2024],
    brewMethodSlugs: ["filtre-kahve-makinesi"],
  }),
  coffee({
    name: "Spring Season Blend",
    brandSlug: "starbucks",
    brandName: "Starbucks",
    form: "whole_bean",
    avgScore: 8.5,
    lastTastedAt: "2026-03-07",
    tastedYears: [2025, 2026],
    brewMethodSlugs: ["v60"],
  }),
  coffee({ name: "Pike Place", brandSlug: "starbucks", brandName: "Starbucks", wishlisted: true }),
];

const names = (filter: Partial<CoffeeFilter>) =>
  filterCoffees(items, { ...DEFAULT_COFFEE_FILTER, ...filter }).map((item) => item.name);

describe("filterCoffees", () => {
  it("shows everything by default, most recently tasted first and untasted last", () => {
    expect(names({})).toEqual([
      "Spring Season Blend",
      "Ristretto",
      "İstanbul Espresso",
      "Privat Kaffee African Blue",
      "Pike Place",
    ]);
  });

  it("searches brand and name without caring about case or Turkish letters", () => {
    expect(names({ query: "ISTANBUL" })).toEqual(["İstanbul Espresso"]);
    expect(names({ query: "istanbul esp" })).toEqual(["İstanbul Espresso"]);
    expect(names({ query: "starbucks pike" })).toEqual(["Pike Place"]);
    expect(names({ query: "çay" })).toEqual([]);
  });

  it("filters by brand, form, brew method and year", () => {
    expect(names({ brand: "tchibo" })).toEqual(["Privat Kaffee African Blue"]);
    expect(names({ form: "whole_bean", sort: "name" })).toEqual([
      "Privat Kaffee African Blue",
      "Spring Season Blend",
    ]);
    expect(names({ method: "v60" })).toEqual(["Spring Season Blend"]);
    expect(names({ year: 2025, sort: "name" })).toEqual([
      "İstanbul Espresso",
      "Ristretto",
      "Spring Season Blend",
    ]);
  });

  it("filters by score range and leaves unrated coffees out of it", () => {
    expect(names({ minScore: 8, sort: "score_desc" })).toEqual([
      "Ristretto",
      "Spring Season Blend",
      "Privat Kaffee African Blue",
    ]);
    expect(names({ maxScore: 7 })).toEqual(["İstanbul Espresso"]);
    expect(names({ minScore: 8, maxScore: 8 })).toEqual(["Privat Kaffee African Blue"]);
  });

  it("sorts by score in both directions with unrated coffees always last", () => {
    expect(names({ sort: "score_desc" }).at(-1)).toBe("Pike Place");
    expect(names({ sort: "score_asc" })).toEqual([
      "İstanbul Espresso",
      "Privat Kaffee African Blue",
      "Spring Season Blend",
      "Ristretto",
      "Pike Place",
    ]);
  });

  it("sorts names with Turkish collation", () => {
    expect(names({ sort: "name" })[0]).toBe("İstanbul Espresso");
    expect(names({ sort: "brand" }).slice(0, 2)).toEqual(["İstanbul Espresso", "Ristretto"]);
  });

  it("combines filters", () => {
    expect(names({ brand: "starbucks", form: "whole_bean", minScore: 1 })).toEqual([
      "Spring Season Blend",
    ]);
  });
});

describe("activeFilterCount", () => {
  it("counts the score range once and ignores the sort order", () => {
    expect(activeFilterCount(DEFAULT_COFFEE_FILTER)).toBe(0);
    expect(
      activeFilterCount({
        ...DEFAULT_COFFEE_FILTER,
        query: " v60 ",
        minScore: 7,
        maxScore: 9,
        sort: "name",
      }),
    ).toBe(2);
  });
});
