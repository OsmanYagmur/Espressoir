import { foldTurkish } from "@espressoir/core";

const MONTHS: Record<string, number> = {};
[
  ["january", "jan", "ocak", "oca"],
  ["february", "feb", "subat", "sub"],
  ["march", "mar", "mart"],
  ["april", "apr", "nisan", "nis"],
  ["may", "mayis"],
  ["june", "jun", "haziran", "haz"],
  ["july", "jul", "temmuz", "tem"],
  ["august", "aug", "agustos", "agu"],
  ["september", "sep", "sept", "eylul", "eyl"],
  ["october", "oct", "ekim", "eki"],
  ["november", "nov", "kasim", "kas"],
  ["december", "dec", "aralik", "ara"],
].forEach((names, index) => {
  for (const name of names) MONTHS[name] = index + 1;
});

export type ParsedDate =
  | { ok: true; date: string }
  | { ok: false; reason: "empty" | "unrecognized" | "ambiguous" | "invalid" };

function build(year: number, month: number, day: number): ParsedDate {
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real || year < 1990 || year > 2100) return { ok: false, reason: "invalid" };
  const pad = (value: number) => String(value).padStart(2, "0");
  return { ok: true, date: `${year}-${pad(month)}-${pad(day)}` };
}

/**
 * Parses the date formats Notion can export: "July 8, 2025", "8 Temmuz 2025", "2025-07-08",
 * "2025/07/08", and day/month/year with slashes when unambiguous. A time of day is ignored
 * and a range ("July 8, 2025 → July 9, 2025") resolves to its start.
 *
 * Never guesses: "03/04/2025" could be March or April, so it is reported as ambiguous.
 */
export function parseNotionDate(input: string): ParsedDate {
  const text = foldTurkish(input.split("→")[0] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return { ok: false, reason: "empty" };

  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ t].*)?$/.exec(text);
  if (match) return build(Number(match[1]), Number(match[2]), Number(match[3]));

  // "July 8, 2025" · "Jul 8 2025"
  match = /^([a-z]+)\.? (\d{1,2})(?:st|nd|rd|th)?,? (\d{4})(?: .*)?$/.exec(text);
  if (match) {
    const month = MONTHS[match[1]!];
    return month
      ? build(Number(match[3]), month, Number(match[2]))
      : { ok: false, reason: "unrecognized" };
  }

  // "8 July 2025" · "8 Temmuz 2025"
  match = /^(\d{1,2})\.? ([a-z]+)\.?,? (\d{4})(?: .*)?$/.exec(text);
  if (match) {
    const month = MONTHS[match[2]!];
    return month
      ? build(Number(match[3]), month, Number(match[1]))
      : { ok: false, reason: "unrecognized" };
  }

  match = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?: .*)?$/.exec(text);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);
    if (first > 12 && second <= 12) return build(year, second, first);
    if (second > 12 && first <= 12) return build(year, first, second);
    if (first === second) return build(year, first, second);
    return { ok: false, reason: "ambiguous" };
  }

  return { ok: false, reason: "unrecognized" };
}
