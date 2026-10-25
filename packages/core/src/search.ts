import { foldTurkish } from "./text/fold-turkish";

/**
 * The site's search (/ara): a small index of everything with a page of its own, matched
 * in the browser as the visitor types. Folded like every other match on the site
 * ("kahve dunyasi" finds "Kahve Dünyası"), each word of the query must be found, and
 * what starts a word counts for more than what sits inside one.
 */

/** What a result is, in the order the groups are shown. */
export const SEARCH_KINDS = ["article", "coffee", "brand", "cafe", "member"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export interface SearchEntry {
  kind: SearchKind;
  title: string;
  /** The line under the title: a brand, a city, a summary. Matched too. */
  detail: string;
  href: string;
  /** Words matched but not shown (a guide's method, a member's display name). */
  keywords?: string;
}

/** An entry with its words folded once, so each key press only compares. */
export interface PreparedEntry extends SearchEntry {
  titleWords: string[];
  titleFolded: string;
  otherWords: string[];
  otherFolded: string;
}

const words = (text: string) => text.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

export function prepareSearch(entries: readonly SearchEntry[]): PreparedEntry[] {
  return entries.map((entry) => {
    const titleFolded = foldTurkish(entry.title);
    const otherFolded = foldTurkish(`${entry.detail} ${entry.keywords ?? ""}`);
    return {
      ...entry,
      titleFolded,
      titleWords: words(titleFolded),
      otherFolded,
      otherWords: words(otherFolded),
    };
  });
}

/** How well one folded query word fits an entry; 0: not at all. */
function wordScore(entry: PreparedEntry, token: string): number {
  if (entry.titleWords[0]?.startsWith(token)) return 4;
  if (entry.titleWords.some((word) => word.startsWith(token))) return 3;
  if (entry.otherWords.some((word) => word.startsWith(token))) return 2;
  // Inside a word only from three letters on: "ka" inside every other word helps nobody.
  if (
    token.length >= 3 &&
    (entry.titleFolded.includes(token) || entry.otherFolded.includes(token))
  ) {
    return 1;
  }
  return 0;
}

export interface SearchGroup {
  kind: SearchKind;
  entries: PreparedEntry[];
  /** How many matched in all; `entries` holds at most the limit. */
  total: number;
}

/**
 * The entries every word of `query` is found in, best first, grouped by kind (kinds with
 * no match are left out), the group with the best match first. An empty query finds
 * nothing.
 */
export function search(entries: readonly PreparedEntry[], query: string, limit = 6): SearchGroup[] {
  const tokens = words(foldTurkish(query));
  if (tokens.length === 0) return [];
  const whole = tokens.join(" ");

  const scored = entries.flatMap((entry) => {
    let score = 0;
    for (const token of tokens) {
      const fit = wordScore(entry, token);
      if (fit === 0) return [];
      score += fit;
    }
    if (entry.titleFolded === whole) score += 6;
    else if (entry.titleFolded.startsWith(whole)) score += 2;
    return [{ entry, score }];
  });
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.entry.title.length - b.entry.title.length ||
      a.entry.title.localeCompare(b.entry.title, "tr"),
  );

  // Groups follow their best match ("kahve dunyasi" shows the brand before its coffees);
  // equal ones keep the order of SEARCH_KINDS.
  return SEARCH_KINDS.flatMap((kind) => {
    const matches = scored.filter(({ entry }) => entry.kind === kind);
    return matches.length > 0 ? [{ kind, matches }] : [];
  })
    .sort((a, b) => b.matches[0]!.score - a.matches[0]!.score)
    .map(({ kind, matches }) => ({
      kind,
      entries: matches.slice(0, limit).map(({ entry }) => entry),
      total: matches.length,
    }));
}
