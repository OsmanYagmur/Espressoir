import { siteConfig } from "@espressoir/core";

const LOCALE = siteConfig.locale;

// Dates in the archive are calendar days with no time zone; format them as UTC so a
// visitor west of Greenwich does not see the day before.
const dayFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const longDayFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: "long", timeZone: "UTC" });
const shortDayFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const decimalFormat = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const percentFormat = new Intl.NumberFormat(LOCALE, { style: "percent", maximumFractionDigits: 0 });
const countryNames = new Intl.DisplayNames([LOCALE], { type: "region" });

/** 0.5 → "%50" */
export function formatPercent(value: number): string {
  return percentFormat.format(value);
}

/** "2025-07-08" → "8 Tem 2025" */
export function formatDay(day: string): string {
  return dayFormat.format(new Date(`${day}T00:00:00Z`));
}

/** "2025-07-08" → "8 Tem" in that same year, "8 Tem 2025" in any other. */
export function formatShortDay(day: string, currentYear: number): string {
  return day.startsWith(`${currentYear}-`)
    ? shortDayFormat.format(new Date(`${day}T00:00:00Z`))
    : formatDay(day);
}

/** "2025-07-08" → "8 Temmuz 2025" */
export function formatLongDay(day: string): string {
  return longDayFormat.format(new Date(`${day}T00:00:00Z`));
}

/** "2025-07" → "Tem 2025" */
export function formatMonth(month: string): string {
  return monthFormat.format(new Date(`${month}-01T00:00:00Z`));
}

/** An average or other non-integer statistic, always with one decimal: 7.25 → "7,3". */
export function formatDecimal(value: number): string {
  return decimalFormat.format(value);
}

/** A score average: whole numbers stay whole ("8"), the rest get one decimal ("7,5"). */
export function formatAverage(value: number): string {
  return Number.isInteger(value) ? String(value) : decimalFormat.format(value);
}

/** ISO 3166-1 alpha-2 → Turkish country name: "CO" → "Kolombiya". */
export function countryName(code: string): string {
  try {
    return countryNames.of(code) ?? code;
  } catch {
    return code;
  }
}
