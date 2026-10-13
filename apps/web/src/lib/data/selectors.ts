/**
 * Pure views over the archive: what each page needs, derived from the one cached read.
 * No I/O here, so these are cheap to call from any page and easy to reason about.
 */
import { shrunkenMean, summarize, type CoffeeListItem, type Summary } from "@espressoir/core";
import type { Archive, BrewMethod, Coffee, MemberList, Profile, Tasting } from "@espressoir/db";

/** Most recent first; undated tastings go last, newest entry first among equals. */
export function byRecency(a: Tasting, b: Tasting): number {
  if (a.tastedAt !== b.tastedAt) {
    if (a.tastedAt === null) return 1;
    if (b.tastedAt === null) return -1;
    return b.tastedAt.localeCompare(a.tastedAt);
  }
  return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
}

export function loggedTastings(archive: Archive): Tasting[] {
  return archive.tastings.filter((tasting) => tasting.status === "logged").sort(byRecency);
}

export function scoresOf(tastings: readonly Tasting[]): number[] {
  return tastings.flatMap((tasting) => (tasting.score === null ? [] : [tasting.score]));
}

export function toListItems(archive: Archive): CoffeeListItem[] {
  const years = new Map<string, Set<number>>();
  const wishlisted = new Set<string>();
  for (const tasting of archive.tastings) {
    if (tasting.status === "wishlist") wishlisted.add(tasting.coffee.id);
    else if (tasting.tastedAt) {
      const set = years.get(tasting.coffee.id) ?? new Set<number>();
      set.add(Number(tasting.tastedAt.slice(0, 4)));
      years.set(tasting.coffee.id, set);
    }
  }

  return archive.coffees.map((coffee) => ({
    id: coffee.id,
    slug: coffee.slug,
    name: coffee.name,
    brandSlug: coffee.brand.slug,
    brandName: coffee.brand.name,
    form: coffee.form,
    brandIntensity: coffee.brandIntensity,
    originCountry: coffee.originCountry,
    avgScore: coffee.stats.avgScore,
    ratedCount: coffee.stats.ratedCount,
    tastingCount: coffee.stats.tastingCount,
    lastTastedAt: coffee.stats.lastTastedAt,
    tastedYears: [...(years.get(coffee.id) ?? [])].sort(),
    brewMethodSlugs: coffee.stats.brewMethodSlugs,
    wishlisted: coffee.stats.tastingCount === 0 && wishlisted.has(coffee.id),
  }));
}

export interface HomeSummary {
  tastingCount: number;
  firstTastedAt: string | null;
  lastTastedAt: string | null;
  coffeeCount: number;
  wishlistCount: number;
  brandCount: number;
  topBrand: { name: string; count: number } | null;
  scores: Summary;
}

export function homeSummary(archive: Archive): HomeSummary {
  const logged = loggedTastings(archive);
  const dates = logged.flatMap((tasting) => (tasting.tastedAt ? [tasting.tastedAt] : [])).sort();

  const perBrand = new Map<string, { name: string; count: number }>();
  for (const tasting of logged) {
    const entry = perBrand.get(tasting.brand.id) ?? { name: tasting.brand.name, count: 0 };
    entry.count++;
    perBrand.set(tasting.brand.id, entry);
  }
  const topBrand =
    [...perBrand.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"),
    )[0] ?? null;

  return {
    tastingCount: logged.length,
    firstTastedAt: dates[0] ?? null,
    lastTastedAt: dates.at(-1) ?? null,
    coffeeCount: archive.coffees.length,
    wishlistCount: archive.coffees.filter((coffee) => coffee.stats.tastingCount === 0).length,
    brandCount: new Set(archive.coffees.map((coffee) => coffee.brand.id)).size,
    topBrand,
    scores: summarize(scoresOf(logged)),
  };
}

/**
 * Best-rated coffees. Ranked by a mean shrunk towards the overall mean (see shrunkenMean),
 * so a single rating does not outrank a well-supported one; ties go to the more recently
 * tasted coffee. The score shown next to each stays its plain average.
 */
export function topCoffees(archive: Archive, limit: number): Coffee[] {
  const overall = summarize(scoresOf(loggedTastings(archive))).mean;
  if (overall === null) return [];
  const rank = (coffee: Coffee) =>
    shrunkenMean(coffee.stats.avgScore!, coffee.stats.ratedCount, overall);

  return archive.coffees
    .filter((coffee) => coffee.stats.avgScore !== null)
    .sort(
      (a, b) =>
        rank(b) - rank(a) ||
        (b.stats.lastTastedAt ?? "").localeCompare(a.stats.lastTastedAt ?? "") ||
        a.name.localeCompare(b.name, "tr"),
    )
    .slice(0, limit);
}

/** Every brew method with how many tastings used it, in the reference order. */
export function methodCounts(archive: Archive): { method: BrewMethod; count: number }[] {
  const counts = new Map<string, number>();
  for (const tasting of loggedTastings(archive)) {
    if (tasting.brewMethod) {
      counts.set(tasting.brewMethod.slug, (counts.get(tasting.brewMethod.slug) ?? 0) + 1);
    }
  }
  return [...archive.brewMethods]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((method) => ({ method, count: counts.get(method.slug) ?? 0 }));
}

export function findCoffee(
  archive: Archive,
  brandSlug: string,
  coffeeSlug: string,
): Coffee | undefined {
  return archive.coffees.find(
    (coffee) => coffee.brand.slug === brandSlug && coffee.slug === coffeeSlug,
  );
}

export function tastingsOf(archive: Archive, coffeeId: string): Tasting[] {
  return archive.tastings.filter((tasting) => tasting.coffee.id === coffeeId).sort(byRecency);
}

/**
 * Coffees worth looking at next to this one. A simple, explainable score: same brand,
 * same origin, same form, a brew method in common and a similar strength each add points.
 */
export function similarCoffees(archive: Archive, coffee: Coffee, limit: number): Coffee[] {
  const methods = new Set(coffee.stats.brewMethodSlugs);
  return archive.coffees
    .filter((other) => other.id !== coffee.id)
    .map((other) => {
      let points = 0;
      if (other.brand.id === coffee.brand.id) points += 3;
      if (coffee.originCountry && other.originCountry === coffee.originCountry) points += 3;
      if (coffee.form && other.form === coffee.form) points += 1;
      if (other.stats.brewMethodSlugs.some((slug) => methods.has(slug))) points += 1;
      if (
        coffee.brandIntensity !== null &&
        other.brandIntensity !== null &&
        Math.abs(coffee.brandIntensity - other.brandIntensity) <= 1
      ) {
        points += 1;
      }
      return { other, points };
    })
    .filter(({ points }) => points >= 3)
    .sort(
      (a, b) =>
        b.points - a.points ||
        (b.other.stats.avgScore ?? 0) - (a.other.stats.avgScore ?? 0) ||
        a.other.name.localeCompare(b.other.name, "tr"),
    )
    .slice(0, limit)
    .map(({ other }) => other);
}

export interface BrandSummary {
  id: string;
  slug: string;
  name: string;
  coffees: Coffee[];
  tastingCount: number;
  scores: Summary;
  best: Coffee | null;
}

export function brandSummaries(archive: Archive): BrandSummary[] {
  const logged = loggedTastings(archive);
  const brands = new Map<string, BrandSummary>();
  for (const coffee of archive.coffees) {
    const brand = brands.get(coffee.brand.id) ?? {
      ...coffee.brand,
      coffees: [],
      tastingCount: 0,
      scores: summarize([]),
      best: null,
    };
    brand.coffees.push(coffee);
    brands.set(coffee.brand.id, brand);
  }
  for (const brand of brands.values()) {
    const tastings = logged.filter((tasting) => tasting.brand.id === brand.id);
    brand.tastingCount = tastings.length;
    brand.scores = summarize(scoresOf(tastings));
    brand.best =
      [...brand.coffees]
        .filter((coffee) => coffee.stats.avgScore !== null)
        .sort((a, b) => b.stats.avgScore! - a.stats.avgScore!)[0] ?? null;
  }
  return [...brands.values()].sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

/** A member by the name in their profile address; usernames are stored in lower case. */
export function findProfile(archive: Archive, username: string): Profile | undefined {
  const wanted = username.toLowerCase();
  return archive.profiles.find((profile) => profile.username === wanted);
}

/** One member's public tastings and wishlist entries, most recent first. */
export function tastingsBy(archive: Archive, userId: string): Tasting[] {
  return archive.tastings.filter((tasting) => tasting.author.id === userId).sort(byRecency);
}

/** One member's public lists, most recently changed first. */
export function listsBy(archive: Archive, userId: string): MemberList[] {
  return archive.lists
    .filter((list) => list.owner.id === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** A public list by its owner's name and its own slug. */
export function findList(archive: Archive, username: string, slug: string): MemberList | undefined {
  const wanted = username.toLowerCase();
  return archive.lists.find((list) => list.owner.username === wanted && list.slug === slug);
}

/** A public, logged tasting by its id: what a tasting's own page shows. */
export function findTasting(archive: Archive, tastingId: string): Tasting | undefined {
  return archive.tastings.find(
    (tasting) => tasting.id === tastingId && tasting.status === "logged",
  );
}
