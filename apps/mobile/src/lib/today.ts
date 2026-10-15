import { siteConfig } from "@espressoir/core";

/** "YYYY-MM-DD" where the archive lives (as on the website): no entry is dated after it. */
export function today(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: siteConfig.timeZone }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** The day `days` before `day` ("YYYY-MM-DD"). */
export function daysBefore(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}
