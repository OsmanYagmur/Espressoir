import type { MetadataRoute } from "next";

import { getArchive } from "@/lib/data/archive";
import { brandSummaries } from "@/lib/data/selectors";
import { brandPath, coffeePath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const archive = await getArchive();
  const base = getSiteUrl();
  const url = (path: string) => new URL(path, base).toString();
  const latest = archive.coffees
    .flatMap((coffee) => (coffee.stats.lastTastedAt ? [coffee.stats.lastTastedAt] : []))
    .sort()
    .at(-1);

  return [
    { url: url("/"), lastModified: latest, changeFrequency: "weekly", priority: 1 },
    { url: url("/kahveler"), lastModified: latest, changeFrequency: "weekly", priority: 0.9 },
    { url: url("/istatistik"), lastModified: latest, changeFrequency: "weekly", priority: 0.6 },
    { url: url("/hakkinda"), changeFrequency: "yearly", priority: 0.4 },
    ...archive.coffees.map((coffee) => ({
      url: url(coffeePath(coffee.brand.slug, coffee.slug)),
      lastModified: coffee.stats.lastTastedAt ?? coffee.createdAt.slice(0, 10),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...brandSummaries(archive).map((brand) => ({
      url: url(brandPath(brand.slug)),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
