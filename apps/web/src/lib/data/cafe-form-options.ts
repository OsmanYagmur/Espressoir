import "server-only";

import { TR_CITIES } from "@espressoir/core";

import type { CafeVisitFormOptions } from "@/components/panel/cafe-visit-form";
import { getArchive } from "@/lib/data/archive";
import { placeOf } from "@/lib/data/cafes";

/** The choices the visit form offers: every café (from the cached archive) and the cities. */
export async function getCafeFormOptions(): Promise<CafeVisitFormOptions> {
  const { cafes } = await getArchive();
  const collator = new Intl.Collator("tr");
  return {
    cafes: cafes
      .map((cafe) => ({
        id: cafe.id,
        label: `${cafe.name} — ${placeOf(cafe)}`,
        cityCode: cafe.cityCode,
      }))
      .sort((a, b) => collator.compare(a.label, b.label)),
    cities: TR_CITIES.map(({ code, name }) => ({ code, name })).sort((a, b) =>
      collator.compare(a.name, b.name),
    ),
  };
}
