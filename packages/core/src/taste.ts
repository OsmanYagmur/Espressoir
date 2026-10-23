import { TASTE_DIMENSIONS, type TasteDimension } from "./catalog";
import { SMALL_SAMPLE } from "./stats";

/** One tasting's taste profile; a dimension its author skipped is null. */
export type TasteProfile = Readonly<Record<TasteDimension, number | null>>;

export interface TasteMean {
  dimension: TasteDimension;
  /** How many tastings rated this dimension. */
  n: number;
  mean: number | null;
  /** True when too few tastings rated it (n < SMALL_SAMPLE) to read much into the mean. */
  small: boolean;
}

/**
 * The average of every taste dimension over the tastings that rated it. Each dimension has
 * its own n: people fill in what they noticed, so the sample differs from corner to corner.
 */
export function tasteMeans(profiles: readonly TasteProfile[]): TasteMean[] {
  return TASTE_DIMENSIONS.map((dimension) => {
    const values = profiles.flatMap((profile) => profile[dimension] ?? []);
    const n = values.length;
    return {
      dimension,
      n,
      mean: n === 0 ? null : values.reduce((sum, value) => sum + value, 0) / n,
      small: n < SMALL_SAMPLE,
    };
  });
}

export interface TagCount {
  slug: string;
  count: number;
}

/**
 * How often each tag was used across a set of tastings, most used first (ties keep the
 * order of `order`, the reference list), and `n`: how many of the tastings carry any tag.
 */
export function countTags(
  tagLists: readonly (readonly string[])[],
  order: readonly string[] = [],
): { tags: TagCount[]; n: number } {
  const counts = new Map<string, number>();
  let n = 0;
  for (const slugs of tagLists) {
    if (slugs.length > 0) n += 1;
    for (const slug of new Set(slugs)) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  const rank = (slug: string) => {
    const index = order.indexOf(slug);
    return index === -1 ? order.length : index;
  };
  const tags = [...counts]
    .map(([slug, count]) => ({ slug, count }))
    .sort(
      (a, b) => b.count - a.count || rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug),
    );
  return { tags, n };
}
