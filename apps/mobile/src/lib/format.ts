import { siteConfig } from "@espressoir/core";

/** Dates and numbers the Turkish way, as on the website (lib/format.ts there). */
const dayFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2025-07-07" → "7 Tem 2025". */
export function formatDay(day: string): string {
  return dayFormat.format(new Date(`${day}T00:00:00Z`));
}

/** An average with one decimal and a Turkish comma; a whole score as it is. */
export function formatScore(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1).replace(".", ",");
}

const momentFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: siteConfig.timeZone,
});

/** A moment (an ISO timestamp) where the archive lives: "15 Eki 20:31". */
export function formatMoment(iso: string): string {
  return momentFormat.format(new Date(iso));
}
