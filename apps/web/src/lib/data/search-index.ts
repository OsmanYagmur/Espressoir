import "server-only";

import type { SearchEntry } from "@espressoir/core";

import { getArchive } from "@/lib/data/archive";
import { getArticles } from "@/lib/data/articles";
import { cafeHref, placeOf } from "@/lib/data/cafes";
import { brandSummaries } from "@/lib/data/selectors";
import { countryName } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { brandPath, coffeePath, profilePath } from "@/lib/routes";

/**
 * Everything the search page finds, built from the same cached reads as the pages (the
 * archive and the articles), so it is as current as they are. Each entry is a title, a
 * line under it and an address; the matching happens in the browser (@espressoir/core).
 */
export async function getSearchIndex(): Promise<SearchEntry[]> {
  const [archive, articles] = await Promise.all([getArchive(), getArticles()]);
  return [
    ...articles.map((article) => ({
      kind: "article" as const,
      title: article.title,
      detail: article.summary,
      href: `/bilgi/${article.slug}`,
      keywords: [article.recipe?.method, t.info.topics[article.topic]].filter(Boolean).join(" "),
    })),
    ...archive.coffees.map((coffee) => ({
      kind: "coffee" as const,
      title: coffee.name,
      detail: [
        coffee.brand.name,
        coffee.form ? t.coffee.forms[coffee.form] : null,
        coffee.originCountry ? countryName(coffee.originCountry) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      href: coffeePath(coffee.brand.slug, coffee.slug),
    })),
    ...brandSummaries(archive).map((brand) => ({
      kind: "brand" as const,
      title: brand.name,
      detail: format(t.search.brandDetail, { count: brand.coffees.length }),
      href: brandPath(brand.slug),
    })),
    ...archive.cafes.map((cafe) => ({
      kind: "cafe" as const,
      title: cafe.name,
      detail: placeOf(cafe),
      href: cafeHref(cafe),
    })),
    ...archive.profiles.map((profile) => ({
      kind: "member" as const,
      title: `@${profile.username}`,
      detail: profile.displayName ?? "",
      href: profilePath(profile.username),
    })),
  ];
}
