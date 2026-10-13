import { countTags, type TagCount } from "@espressoir/core";
import type { Archive, Tasting } from "@espressoir/db";

import type { RadarAxis } from "@/components/stats/radar";
import { meanAxes } from "@/lib/taste-axes";

/** How many tags the "most used" lists show. */
const TOP_TAGS = 8;

export interface TasteSummary {
  /** The average profile, one corner per dimension; null when nobody rated any. */
  axes: RadarAxis[] | null;
  /** The most used tags, most used first. */
  tags: TagCount[];
  /** How many of the tastings carry at least one tag. */
  taggedCount: number;
  /** Tag slug → name, for printing. */
  names: ReadonlyMap<string, string>;
}

/**
 * The taste profile and the flavour tags of a set of tastings (one coffee's, or one
 * member's). Only tastings that were actually logged count; the archive already holds
 * nothing but public, visible ones.
 */
export function tasteSummary(archive: Archive, tastings: readonly Tasting[]): TasteSummary {
  const logged = tastings.filter((tasting) => tasting.status === "logged");
  const axes = meanAxes(logged.map((tasting) => tasting.profile));
  const { tags, n } = countTags(
    logged.map((tasting) => tasting.tags.map((tag) => tag.slug)),
    archive.flavorTags.map((tag) => tag.slug),
  );
  return {
    axes: axes.some((axis) => axis.value !== null) ? axes : null,
    tags: tags.slice(0, TOP_TAGS),
    taggedCount: n,
    names: new Map(archive.flavorTags.map((tag) => [tag.slug, tag.name])),
  };
}
