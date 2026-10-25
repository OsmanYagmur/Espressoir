import "server-only";

import { siteConfig } from "@espressoir/core";
import type { Workshop } from "@espressoir/db";

import type { PhotoId } from "@/content/photos";
import type { SiteArticle } from "@/lib/data/articles";
import { format, t } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";

/**
 * schema.org descriptions of the public pages (JSON-LD), so search results can show a
 * guide as a recipe, a workshop as an event, and every page with the path above it. Each
 * builder returns plain data; <JsonLd> writes it into the page.
 */

const absolute = (path: string) => new URL(path, getSiteUrl()).toString();

/** The site as the author of its texts. */
function organization() {
  return {
    "@type": "Organization",
    name: siteConfig.name,
    url: absolute("/"),
    logo: absolute("/icon/512"),
  };
}

const photoUrl = (id: PhotoId) => absolute(`/images/${id}-1280.webp`);

/** The path above a page: "Bilgi › V60 nedir…"; the last item is the page itself. */
export function breadcrumbs(items: readonly { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

/** The home page: the site, its search box and who runs it. */
export function website() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: absolute("/"),
    inLanguage: siteConfig.locale,
    publisher: organization(),
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absolute("/ara")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** "PT3M", "PT18H": a duration as schema.org writes it. */
function isoDuration(seconds: number): string {
  if (seconds % 3600 === 0) return `PT${seconds / 3600}H`;
  if (seconds % 60 === 0) return `PT${seconds / 60}M`;
  return `PT${seconds}S`;
}

/**
 * An article as an Article; a brewing guide as a Recipe (its ingredients from the recipe
 * box, its instructions from the numbered steps, its time from the assistant's plan).
 */
export function article(item: SiteArticle) {
  const url = absolute(`/bilgi/${item.slug}`);
  const common = {
    "@context": "https://schema.org",
    name: item.title,
    description: item.summary,
    url,
    inLanguage: siteConfig.locale,
    author: organization(),
    ...(item.photo ? { image: [photoUrl(item.photo)] } : {}),
  };
  if (item.recipe === null) {
    return {
      ...common,
      "@type": "Article",
      headline: item.title,
      publisher: organization(),
      mainEntityOfPage: url,
    };
  }
  const { recipe, brewPlan } = item;
  const steps = item.blocks.flatMap((block) => (block.kind === "steps" ? block.items : []));
  const seconds = brewPlan
    ? brewPlan.kind === "timed"
      ? brewPlan.end
      : brewPlan.hours.to * 3600
    : null;
  return {
    ...common,
    "@type": "Recipe",
    recipeCategory: t.info.topics.demleme,
    recipeYield: "1",
    recipeIngredient: [
      `${recipe.dose} ${t.info.recipe.dose.toLocaleLowerCase("tr")} (${format(t.info.recipe.grindShort, { grind: recipe.grind })})`,
      `${recipe.water} ${t.info.recipe.water.toLocaleLowerCase("tr")}${
        recipe.temperature ? ` (${recipe.temperature})` : ""
      }`,
    ],
    recipeInstructions: steps.map((text, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text,
    })),
    ...(seconds === null ? {} : { totalTime: isoDuration(seconds) }),
  };
}

/** A workshop as an Event at a place, with its seats. */
export function workshopEvent(
  workshop: Workshop,
  extra: { description: string | null; photo: PhotoId | null },
) {
  const place = workshop.locationText ?? siteConfig.name;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: workshop.title,
    startDate: workshop.startsAt,
    endDate: workshop.endsAt,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: place,
      address: { "@type": "PostalAddress", addressLocality: place, addressCountry: "TR" },
    },
    organizer: organization(),
    url: absolute(`/workshop/${workshop.id}`),
    inLanguage: siteConfig.locale,
    maximumAttendeeCapacity: workshop.capacity,
    remainingAttendeeCapacity: workshop.seatsLeft,
    ...(extra.description ? { description: extra.description } : {}),
    ...(extra.photo ? { image: [photoUrl(extra.photo)] } : {}),
  };
}
