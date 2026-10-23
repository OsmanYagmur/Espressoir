import { RECOMMEND_MIN_SCORED } from "@espressoir/core";
import {
  importedRecommendationSchema,
  suggestCoffees,
  tastingRowSchema,
  type Archive,
  type Suggestion,
} from "@espressoir/db";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";

import {
  RecommendationList,
  type RecommendationRow,
} from "@/components/coffee/recommendation-list";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getArchive } from "@/lib/data/archive";
import { format, t } from "@/lib/i18n";
import { coffeePath } from "@/lib/routes";

const r = t.recommendations;
const SHOWN = 12;

export const metadata: Metadata = {
  title: r.title,
  description: r.description,
  robots: { index: false, follow: false },
};

function reasonText(archive: Archive, reason: Suggestion["reason"]): string {
  switch (reason.kind) {
    case "model":
      return reason.text ?? r.reasons.model;
    case "top":
      return r.topTitle;
    case "tags": {
      const names = new Map(archive.flavorTags.map((tag) => [tag.slug, tag.name]));
      return format(r.reasons.tags, {
        tags: reason.tags.map((slug) => names.get(slug) ?? slug).join(", "),
      });
    }
    case "together":
      return format(r.reasons.together, {
        via: archive.coffees.find((coffee) => coffee.id === reason.via)?.name ?? "",
        count: reason.members,
      });
    default:
      return r.reasons.taste;
  }
}

async function Recommendations() {
  const { user, supabase } = await requireUser();
  const archive = await getArchive();
  // The member's own tastings, private ones included: they are only used for this page.
  const { data, error } = await supabase.from("tasting_feed").select("*").eq("user_id", user.id);
  if (error) throw new Error(error.message);
  // A database without the table yet: the site's own model.
  const imported = await supabase
    .from("recommendations")
    .select("coffee_id, model, score, reason, created_at");

  const suggestions = suggestCoffees({
    archive,
    userId: user.id,
    own: z.array(tastingRowSchema).parse(data),
    imported: imported.error ? [] : z.array(importedRecommendationSchema).parse(imported.data),
    limit: SHOWN,
  });
  const rows: RecommendationRow[] = suggestions.items.map(({ coffee, reason }) => ({
    coffeeId: coffee.id,
    href: coffeePath(coffee.brand.slug, coffee.slug),
    brandName: coffee.brand.name,
    coffeeName: coffee.name,
    reason: reasonText(archive, reason),
    avgScore: coffee.stats.avgScore,
  }));

  if (suggestions.source === "top") {
    return (
      <>
        <p className="mb-6 text-ink-2">
          {format(r.tooFew, { min: RECOMMEND_MIN_SCORED, count: suggestions.scored })}
        </p>
        <RecommendationList rows={rows} label={r.topTitle} />
      </>
    );
  }
  if (rows.length === 0) {
    return <p className="text-ink-2">{r.empty}</p>;
  }
  return (
    <>
      <p className="mb-6 type-meta">
        {suggestions.source === "model"
          ? format(r.fromModel, { model: suggestions.model })
          : r.fromSite}
      </p>
      <RecommendationList rows={rows} label={r.listLabel} />
    </>
  );
}

export default function RecommendationsPage() {
  return (
    <PageShell width="read">
      <PageHeading title={r.title} lead={r.lead} size="title" />
      <Section id="oneriler" className="mt-0 md:mt-0">
        <SectionHeading id="oneriler" title={r.listLabel} />
        <Suspense fallback={<Skeleton className="h-96" />}>
          <Recommendations />
        </Suspense>
      </Section>
      <Section id="nasil">
        <SectionHeading id="nasil" title={r.howTitle} />
        <p>{r.how}</p>
      </Section>
    </PageShell>
  );
}
