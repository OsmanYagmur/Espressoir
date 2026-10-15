import { cityByCode } from "@espressoir/core";
import type { Cafe, CafeVisit } from "@espressoir/db";

import { t } from "./i18n";

/** "Kadıköy, İstanbul" (or just the city), as on the website. */
export function placeOf(cafe: Pick<Cafe, "cityCode" | "district">): string {
  return [cafe.district, cityByCode(cafe.cityCode)?.name].filter(Boolean).join(", ");
}

/** "Flat white" or "Filtre kahve · Etiyopya V60". */
export function drinkLabel(visit: Pick<CafeVisit, "drink" | "drinkName">): string {
  return [t.cafes.drinks[visit.drink], visit.drinkName].filter(Boolean).join(" · ");
}
