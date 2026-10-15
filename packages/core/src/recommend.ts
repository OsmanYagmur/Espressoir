/**
 * The site's own coffee suggestions: a small, explainable model, meant to be read and
 * replaced. A model trained elsewhere (`pnpm import:recommendations`) takes its place for
 * the members it covers.
 *
 * Three signals, each between 0 and 1, for every coffee the member has not had:
 *
 * - **taste**: how close the coffee's community taste profile is to the average profile of
 *   the tastings the member liked (scored at or above their own mean);
 * - **tags**: how much the coffee's flavour tags overlap with the tags of those tastings
 *   (cosine similarity of the two tag counts);
 * - **together**: how many other members liked one of the coffees the member liked and
 *   also liked this one ("people who liked X also liked Y").
 *
 * The suggestion's score is their weighted sum (a missing signal counts as 0), nudged by
 * how well the community rated the coffee, and it comes with the signal that contributed
 * most as its reason. Signals drawn from one or two tastings count for less.
 */
import { TASTE_DIMENSIONS, TASTE_MAX, TASTE_MIN } from "./catalog";
import { RANKING_PRIOR_WEIGHT, shrunkenMean } from "./stats";
import { tasteMeans, type TasteProfile } from "./taste";

/** A logged tasting as the model sees it. */
export interface RatedTasting {
  memberId: string;
  coffeeId: string;
  score: number | null;
  taste: TasteProfile;
  /** Flavour tag slugs. */
  tags: readonly string[];
}

/** Below this many scored tastings the member's taste is not known well enough. */
export const RECOMMEND_MIN_SCORED = 3;

export const RECOMMEND_WEIGHTS = { taste: 0.4, tags: 0.3, together: 0.3 } as const;

/** Taste profiles are compared on at least this many shared dimensions. */
const MIN_SHARED_DIMENSIONS = 3;

export type RecommendationReason =
  | { kind: "taste"; similarity: number }
  | { kind: "tags"; tags: string[] }
  | { kind: "together"; members: number; via: string };

export interface Recommendation {
  coffeeId: string;
  /** Between 0 and 1; only the order matters. */
  score: number;
  reason: RecommendationReason;
  signals: { taste: number | null; tags: number | null; together: number | null };
}

export type RecommendResult =
  { status: "ok"; items: Recommendation[] } | { status: "too_few"; scored: number };

const mean = (values: readonly number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/** n tastings behind a signal: one counts for half, many for nearly all of it. */
const confidence = (n: number) => n / (n + 1);

function countTagsOf(tastings: readonly RatedTasting[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const tasting of tastings) {
    for (const tag of new Set(tasting.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return counts;
}

function cosine(a: ReadonlyMap<string, number>, b: ReadonlyMap<string, number>): number {
  let dot = 0;
  for (const [tag, count] of a) dot += count * (b.get(tag) ?? 0);
  const norm = (map: ReadonlyMap<string, number>) =>
    Math.sqrt([...map.values()].reduce((sum, value) => sum + value * value, 0));
  return dot === 0 ? 0 : dot / (norm(a) * norm(b));
}

/** 1 for identical profiles, 0 for opposite ends of the scale; null with too little overlap. */
function tasteSimilarity(
  liked: readonly RatedTasting[],
  theirs: readonly RatedTasting[],
): number | null {
  const mine = tasteMeans(liked.map((tasting) => tasting.taste));
  const coffee = tasteMeans(theirs.map((tasting) => tasting.taste));
  let distance = 0;
  let shared = 0;
  TASTE_DIMENSIONS.forEach((_, index) => {
    const a = mine[index]!.mean;
    const b = coffee[index]!.mean;
    if (a === null || b === null) return;
    distance += Math.abs(a - b);
    shared += 1;
  });
  if (shared < MIN_SHARED_DIMENSIONS) return null;
  return 1 - distance / (shared * (TASTE_MAX - TASTE_MIN));
}

/** Coffees each member liked: scored at or above their own mean (members with 2+ scores). */
function likedByMember(tastings: readonly RatedTasting[]): Map<string, Set<string>> {
  const scores = new Map<string, { coffeeId: string; score: number }[]>();
  for (const tasting of tastings) {
    if (tasting.score === null) continue;
    const list = scores.get(tasting.memberId) ?? [];
    list.push({ coffeeId: tasting.coffeeId, score: tasting.score });
    scores.set(tasting.memberId, list);
  }
  const liked = new Map<string, Set<string>>();
  for (const [member, list] of scores) {
    if (list.length < 2) continue;
    const average = mean(list.map((entry) => entry.score));
    liked.set(
      member,
      new Set(list.filter((entry) => entry.score >= average).map((entry) => entry.coffeeId)),
    );
  }
  return liked;
}

/**
 * Suggestions for one member.
 *
 * @param mine   the member's own logged tastings, private ones included (only they see the result)
 * @param others everyone else's public logged tastings
 * @param exclude coffees not to suggest besides the ones in `mine` (their wishlist, say)
 */
export function recommendCoffees({
  mine,
  others,
  exclude = [],
  limit = 12,
}: {
  mine: readonly RatedTasting[];
  others: readonly RatedTasting[];
  exclude?: Iterable<string>;
  limit?: number;
}): RecommendResult {
  const scored = mine.filter((tasting) => tasting.score !== null);
  if (scored.length < RECOMMEND_MIN_SCORED) return { status: "too_few", scored: scored.length };

  const myMean = mean(scored.map((tasting) => tasting.score!));
  const liked = scored.filter((tasting) => tasting.score! >= myMean);
  const likedCoffees = new Set(liked.map((tasting) => tasting.coffeeId));
  const seen = new Set([...mine.map((tasting) => tasting.coffeeId), ...exclude]);
  const myTags = countTagsOf(liked);

  // Everyone else's tastings, by coffee: the candidates and what is known about them.
  const byCoffee = new Map<string, RatedTasting[]>();
  for (const tasting of others) {
    if (seen.has(tasting.coffeeId)) continue;
    const list = byCoffee.get(tasting.coffeeId) ?? [];
    list.push(tasting);
    byCoffee.set(tasting.coffeeId, list);
  }

  // "Together": a member who liked one of my favourites votes for every other coffee they liked.
  const votes = new Map<string, { members: number; via: Map<string, number> }>();
  for (const [, theirLiked] of likedByMember(others)) {
    const bridges = [...theirLiked].filter((coffee) => likedCoffees.has(coffee));
    if (bridges.length === 0) continue;
    for (const coffee of theirLiked) {
      if (seen.has(coffee)) continue;
      const entry = votes.get(coffee) ?? { members: 0, via: new Map<string, number>() };
      entry.members += 1;
      for (const bridge of bridges) entry.via.set(bridge, (entry.via.get(bridge) ?? 0) + 1);
      votes.set(coffee, entry);
    }
  }

  const allScores = others.flatMap((tasting) => (tasting.score === null ? [] : [tasting.score]));
  const prior = allScores.length > 0 ? mean(allScores) : null;

  const items: (Recommendation & { communityMean: number })[] = [];
  for (const [coffeeId, theirs] of byCoffee) {
    const withTaste = theirs.filter((tasting) =>
      TASTE_DIMENSIONS.some((dimension) => tasting.taste[dimension] !== null),
    );
    const rawTaste = liked.length > 0 ? tasteSimilarity(liked, withTaste) : null;
    const taste = rawTaste === null ? null : rawTaste * confidence(withTaste.length);

    const coffeeTags = countTagsOf(theirs);
    const tagged = theirs.filter((tasting) => tasting.tags.length > 0).length;
    const tags =
      myTags.size > 0 && coffeeTags.size > 0
        ? cosine(myTags, coffeeTags) * confidence(tagged)
        : null;

    const vote = votes.get(coffeeId);
    const together = vote ? vote.members / (vote.members + 2) : null;

    const parts = {
      taste: (taste ?? 0) * RECOMMEND_WEIGHTS.taste,
      tags: (tags ?? 0) * RECOMMEND_WEIGHTS.tags,
      together: (together ?? 0) * RECOMMEND_WEIGHTS.together,
    };
    const signal = parts.taste + parts.tags + parts.together;
    if (signal <= 0) continue;

    // The community's verdict nudges the order: a well-liked coffee a little up, a
    // poorly rated one a little down (between ×0.75 and ×1).
    const coffeeScores = theirs.flatMap((tasting) =>
      tasting.score === null ? [] : [tasting.score],
    );
    const communityMean =
      coffeeScores.length > 0 && prior !== null
        ? shrunkenMean(mean(coffeeScores), coffeeScores.length, prior, RANKING_PRIOR_WEIGHT)
        : (prior ?? 5.5);
    const quality = Math.min(Math.max((communityMean - 1) / 9, 0), 1);
    const score = signal * (0.75 + 0.25 * quality);

    const strongest = (Object.keys(parts) as (keyof typeof parts)[]).reduce((best, key) =>
      parts[key] > parts[best] ? key : best,
    );
    let reason: RecommendationReason;
    if (strongest === "together" && vote) {
      const via = [...vote.via].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]![0];
      reason = { kind: "together", members: vote.members, via };
    } else if (strongest === "tags") {
      const sharedTags = [...coffeeTags.keys()]
        .filter((tag) => myTags.has(tag))
        .sort(
          (a, b) =>
            myTags.get(b)! * coffeeTags.get(b)! - myTags.get(a)! * coffeeTags.get(a)! ||
            a.localeCompare(b),
        )
        .slice(0, 2);
      reason = { kind: "tags", tags: sharedTags };
    } else {
      reason = { kind: "taste", similarity: rawTaste ?? 0 };
    }

    items.push({
      coffeeId,
      score,
      reason,
      signals: { taste, tags, together },
      communityMean,
    });
  }

  items.sort(
    (a, b) =>
      b.score - a.score ||
      b.communityMean - a.communityMean ||
      a.coffeeId.localeCompare(b.coffeeId),
  );
  return {
    status: "ok",
    items: items.slice(0, limit).map((item) => ({
      coffeeId: item.coffeeId,
      score: item.score,
      reason: item.reason,
      signals: item.signals,
    })),
  };
}
