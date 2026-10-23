import { siteConfig } from "@espressoir/core";
import { cacheLife } from "next/cache";

/**
 * The year it is now in the site's time zone, for dates that leave out the current year
 * ("23 Eki"). Read inside a cache scope, as a static page must: it is at most a day late.
 */
export async function getCurrentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  const year = new Intl.DateTimeFormat("en", { timeZone: siteConfig.timeZone, year: "numeric" });
  return Number(year.format(new Date()));
}
