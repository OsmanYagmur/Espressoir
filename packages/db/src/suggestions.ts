/**
 * What a member's suggestions page shows, the same on the web and in the app: a model
 * loaded for them (its latest import), else the site's own model (@espressoir/core,
 * recommend.ts), else, with too few scored tastings, the community's favourites. Only the
 * wording is left to each app.
 */
import { recommendCoffees, type RatedTasting, type RecommendationReason } from "@espressoir/core";
import { z } from "zod";

import type { Archive, Coffee, Tasting } from "./archive";
import { topCoffees } from "./selectors";

/** A row of `recommendations`, as the member reads their own. */
export const importedRecommendationSchema = z
  .object({
    coffee_id: z.uuid(),
    model: z.string(),
    score: z.coerce.number(),
    reason: z.string().nullable(),
    created_at: z.string(),
  })
  .transform((row) => ({
    coffeeId: row.coffee_id,
    model: row.model,
    score: row.score,
    reason: row.reason,
    createdAt: row.created_at,
  }));
export type ImportedRecommendation = z.infer<typeof importedRecommendationSchema>;

export interface Suggestion {
  coffee: Coffee;
  reason: RecommendationReason | { kind: "model"; text: string | null } | { kind: "top" };
}

export type Suggestions =
  | { source: "model"; model: string; items: Suggestion[] }
  | { source: "site"; items: Suggestion[] }
  | { source: "top"; scored: number; items: Suggestion[] };

const rated = (tasting: Tasting): RatedTasting => ({
  memberId: tasting.author.id,
  coffeeId: tasting.coffee.id,
  score: tasting.score,
  taste: tasting.profile,
  tags: tasting.tags.map((tag) => tag.slug),
});

/**
 * @param own the member's own tastings, private ones and wishlist entries included
 * @param imported their rows of `recommendations` (empty where the table does not exist)
 */
export function suggestCoffees({
  archive,
  userId,
  own,
  imported,
  limit = 12,
}: {
  archive: Archive;
  userId: string;
  own: readonly Tasting[];
  imported: readonly ImportedRecommendation[];
  limit?: number;
}): Suggestions {
  const coffees = new Map(archive.coffees.map((coffee) => [coffee.id, coffee]));
  const seen = new Set(own.map((tasting) => tasting.coffee.id));

  // A model trained elsewhere wins where it has suggestions: its latest import, minus what
  // the member has had since.
  const latest = imported.reduce<ImportedRecommendation | null>(
    (newest, row) => (newest === null || row.createdAt > newest.createdAt ? row : newest),
    null,
  );
  if (latest) {
    const items = imported
      .filter((row) => row.model === latest.model && !seen.has(row.coffeeId))
      .sort((a, b) => b.score - a.score)
      .flatMap((row) => {
        const coffee = coffees.get(row.coffeeId);
        return coffee ? [{ coffee, reason: { kind: "model" as const, text: row.reason } }] : [];
      })
      .slice(0, limit);
    if (items.length > 0) return { source: "model", model: latest.model, items };
  }

  const result = recommendCoffees({
    mine: own.filter((tasting) => tasting.status === "logged").map(rated),
    others: archive.tastings
      .filter((tasting) => tasting.status === "logged" && tasting.author.id !== userId)
      .map(rated),
    exclude: seen,
    limit,
  });
  if (result.status === "too_few") {
    const items = topCoffees(archive, limit + seen.size)
      .filter((coffee) => !seen.has(coffee.id))
      .slice(0, 8)
      .map((coffee) => ({ coffee, reason: { kind: "top" as const } }));
    return { source: "top", scored: result.scored, items };
  }
  return {
    source: "site",
    items: result.items.flatMap((item) => {
      const coffee = coffees.get(item.coffeeId);
      return coffee ? [{ coffee, reason: item.reason }] : [];
    }),
  };
}
