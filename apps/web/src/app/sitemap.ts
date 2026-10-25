import type { MetadataRoute } from "next";

import { getArchive } from "@/lib/data/archive";
import { getArticles } from "@/lib/data/articles";
import { cafeHref } from "@/lib/data/cafes";
import { brandSummaries } from "@/lib/data/selectors";
import { brandPath, coffeePath, listPath, profilePath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [archive, articles] = await Promise.all([getArchive(), getArticles()]);
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
    { url: url("/akis"), lastModified: latest, changeFrequency: "daily", priority: 0.7 },
    { url: url("/kafeler"), changeFrequency: "weekly", priority: 0.7 },
    { url: url("/workshop"), changeFrequency: "weekly", priority: 0.8 },
    { url: url("/bilgi"), changeFrequency: "monthly", priority: 0.6 },
    { url: url("/kahve-testi"), changeFrequency: "yearly", priority: 0.5 },
    ...articles.map((article) => ({
      url: url(`/bilgi/${article.slug}`),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    // A coffee a member added is listed once an admin has checked it.
    ...archive.coffees
      .filter((coffee) => coffee.isReviewed)
      .map((coffee) => ({
        url: url(coffeePath(coffee.brand.slug, coffee.slug)),
        lastModified: coffee.stats.lastTastedAt ?? coffee.createdAt.slice(0, 10),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
    // Cafés too: listed once an admin has checked them.
    ...archive.cafes
      .filter((cafe) => cafe.isReviewed)
      .map((cafe) => ({
        url: url(cafeHref(cafe)),
        lastModified: cafe.lastVisitedOn ?? cafe.createdAt.slice(0, 10),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
    ...brandSummaries(archive).map((brand) => ({
      url: url(brandPath(brand.slug)),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    // A notebook without public tastings is not listed (its page asks not to be indexed).
    ...archive.profiles
      .filter((profile) => profile.stats.tastingCount > 0)
      .map((profile) => ({
        url: url(profilePath(profile.username)),
        lastModified: profile.stats.lastTastedAt ?? undefined,
        changeFrequency: "weekly" as const,
        priority: 0.5,
      })),
    ...archive.lists
      .filter((list) => list.items.length > 0)
      .map((list) => ({
        url: url(listPath(list.owner.username, list.slug)),
        lastModified: list.updatedAt.slice(0, 10),
        changeFrequency: "monthly" as const,
        priority: 0.4,
      })),
    ...["/kvkk", "/gizlilik", "/kosullar"].map((path) => ({
      url: url(path),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    })),
  ];
}
