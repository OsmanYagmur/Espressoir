import "server-only";

import { COFFEE_ORIGIN_COUNTRIES } from "@espressoir/core";

import type { TastingFormOptions } from "@/components/panel/tasting-form";
import { getArchive } from "@/lib/data/archive";
import { countryName } from "@/lib/format";

/** The choices the tasting form offers: the public catalog, so the cached archive will do. */
export async function getTastingFormOptions(): Promise<TastingFormOptions> {
  const archive = await getArchive();
  const collator = new Intl.Collator("tr");
  return {
    coffees: archive.coffees
      .map((coffee) => ({ id: coffee.id, label: `${coffee.brand.name} — ${coffee.name}` }))
      .sort((a, b) => collator.compare(a.label, b.label)),
    brands: [...new Set(archive.coffees.map((coffee) => coffee.brand.name))].sort(collator.compare),
    brewMethods: [...archive.brewMethods]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ slug, name }) => ({ slug, name })),
    devices: [
      ...new Set(archive.tastings.flatMap((tasting) => (tasting.device ? [tasting.device] : []))),
    ].sort(collator.compare),
    flavorTags: archive.flavorTags.map(({ slug, name, group }) => ({ slug, name, group })),
    origins: COFFEE_ORIGIN_COUNTRIES.map((code) => ({ code, name: countryName(code) })).sort(
      (a, b) => collator.compare(a.name, b.name),
    ),
  };
}
