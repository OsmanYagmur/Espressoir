import { SCORE_MAX, SCORE_MIN } from "./score";

/** Groups smaller than this are too thin to read much into; the UI shows them faded. */
export const SMALL_SAMPLE = 3;

export interface Summary {
  n: number;
  mean: number | null;
  median: number | null;
  /** Sample standard deviation (n − 1); null when n < 2. */
  sd: number | null;
  min: number | null;
  max: number | null;
}

export function summarize(values: readonly number[]): Summary {
  const n = values.length;
  if (n === 0) return { n, mean: null, median: null, sd: null, min: null, max: null };

  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / n;
  const middle = Math.floor(n / 2);
  const median = n % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  const sd =
    n < 2 ? null : Math.sqrt(sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1));

  return { n, mean, median, sd, min: sorted[0]!, max: sorted[n - 1]! };
}

/** Counts per score, index 0 = score 1 … index 9 = score 10. */
export function scoreHistogram(scores: readonly number[]): number[] {
  const counts = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, () => 0);
  for (const score of scores) {
    const index = score - SCORE_MIN;
    if (Number.isInteger(score) && index >= 0 && index < counts.length) counts[index]!++;
  }
  return counts;
}

export interface GroupSummary extends Summary {
  key: string;
  /** True when the group is too small (n < SMALL_SAMPLE) to compare with confidence. */
  small: boolean;
}

/**
 * Summary per group, highest mean first (ties: larger group first, then key).
 * Items whose key or value is null are left out.
 */
export function summarizeBy<T>(
  items: readonly T[],
  keyOf: (item: T) => string | null,
  valueOf: (item: T) => number | null,
): GroupSummary[] {
  const groups = new Map<string, number[]>();
  for (const item of items) {
    const key = keyOf(item);
    const value = valueOf(item);
    if (key === null || value === null) continue;
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return [...groups.entries()]
    .map(([key, values]) => ({ key, ...summarize(values), small: values.length < SMALL_SAMPLE }))
    .sort((a, b) => b.mean! - a.mean! || b.n - a.n || a.key.localeCompare(b.key));
}

/**
 * Number of dates per calendar month, as a continuous series from the first to the last
 * month (empty months included, so gaps stay visible on a chart). Dates are "YYYY-MM-DD".
 */
export function monthlyCounts(dates: readonly string[]): { month: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const month = date.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(month)) counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  const months = [...counts.keys()].sort();
  if (months.length === 0) return [];

  const series: { month: string; count: number }[] = [];
  let [year, month] = months[0]!.split("-").map(Number) as [number, number];
  const last = months[months.length - 1]!;
  for (;;) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    series.push({ month: key, count: counts.get(key) ?? 0 });
    if (key === last) return series;
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
}

/** Identical (x, y) pairs collapsed into one point with a count, for scatter plots. */
export function countPoints(
  points: readonly { x: number; y: number }[],
): { x: number; y: number; count: number }[] {
  const merged = new Map<string, { x: number; y: number; count: number }>();
  for (const { x, y } of points) {
    const key = `${x}:${y}`;
    const point = merged.get(key) ?? { x, y, count: 0 };
    point.count++;
    merged.set(key, point);
  }
  return [...merged.values()].sort((a, b) => a.x - b.x || a.y - b.y);
}

/** How many "average" ratings a coffee is assumed to start with when it is ranked. */
export const RANKING_PRIOR_WEIGHT = 3;

/**
 * A mean pulled towards the overall mean in proportion to how little data it rests on:
 * (n·mean + m·prior) / (n + m). Used for ranking only, so that one enthusiastic rating
 * does not outrank a coffee twenty people liked; what is displayed stays the raw mean
 * with its n.
 */
export function shrunkenMean(
  mean: number,
  n: number,
  prior: number,
  weight: number = RANKING_PRIOR_WEIGHT,
): number {
  return (n * mean + weight * prior) / (n + weight);
}
