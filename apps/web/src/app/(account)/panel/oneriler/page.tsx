import { RECOMMEND_MIN_SCORED, recommendCoffees, type RatedTasting } from "@espressoir/core";
import { tastingRowSchema, type Archive, type Tasting } from "@espressoir/db";
import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";

import {
  RecommendationList,
  type RecommendationRow,
} from "@/components/coffee/recommendation-list";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { getArchive } from "@/lib/data/archive";
import { topCoffees } from "@/lib/data/selectors";
import { format, t } from "@/lib/i18n";
import { coffeePath } from "@/lib/routes";

const r = t.recommendations;
const SHOWN = 12;

export const metadata: Metadata = {
  title: r.title,
  description: r.description,
  robots: { index: false, follow: false },
};

const rated = (tasting: Tasting): RatedTasting => ({
  memberId: tasting.author.id,
  coffeeId: tasting.coffee.id,
  score: tasting.score,
  taste: tasting.profile,
  tags: tasting.tags.map((tag) => tag.slug),
});

const modelRowSchema = z.object({
  coffee_id: z.uuid(),
  model: z.string(),
  score: z.coerce.number(),
  reason: z.string().nullable(),
  created_at: z.string(),
});

function rowFor(archive: Archive, coffeeId: string, reason: string): RecommendationRow | null {
  const coffee = archive.coffees.find((candidate) => candidate.id === coffeeId);
  if (!coffee) return null;
  return {
    coffeeId,
    href: coffeePath(coffee.brand.slug, coffee.slug),
    brandName: coffee.brand.name,
    coffeeName: coffee.name,
    reason,
    avgScore: coffee.stats.avgScore,
  };
}

async function Recommendations() {
  const { user, supabase } = await requireUser();
  const archive = await getArchive();
  // The member's own tastings, private ones included: they are only used for this page.
  const { data, error } = await supabase.from("tasting_feed").select("*").eq("user_id", user.id);
  if (error) throw new Error(error.message);
  const own = z.array(tastingRowSchema).parse(data);
  const logged = own.filter((tasting) => tasting.status === "logged");
  const seen = new Set(own.map((tasting) => tasting.coffee.id));

  // A model trained elsewhere wins where it has suggestions for this member: its latest
  // import, minus what the member has had since. (No such table yet: the site's own model.)
  const imported = await supabase
    .from("recommendations")
    .select("coffee_id, model, score, reason, created_at");
  const modelRows = imported.error ? [] : z.array(modelRowSchema).parse(imported.data);
  const latest = modelRows.reduce<(typeof modelRows)[number] | null>(
    (newest, row) => (newest === null || row.created_at > newest.created_at ? row : newest),
    null,
  );
  if (latest) {
    const rows = modelRows
      .filter((row) => row.model === latest.model && !seen.has(row.coffee_id))
      .sort((a, b) => b.score - a.score)
      .flatMap((row) => rowFor(archive, row.coffee_id, row.reason ?? r.reasons.model) ?? [])
      .slice(0, SHOWN);
    if (rows.length > 0) {
      return (
        <>
          <p className="border-b border-border py-3 font-mono text-xs text-muted-foreground">
            {format(r.fromModel, { model: latest.model })}
          </p>
          <RecommendationList rows={rows} label={r.listLabel} />
        </>
      );
    }
  }

  const tagNames = new Map(archive.flavorTags.map((tag) => [tag.slug, tag.name]));
  const coffeeName = (id: string) => archive.coffees.find((coffee) => coffee.id === id)?.name ?? "";
  const result = recommendCoffees({
    mine: logged.map(rated),
    others: archive.tastings
      .filter((tasting) => tasting.status === "logged" && tasting.author.id !== user.id)
      .map(rated),
    limit: SHOWN,
  });

  if (result.status === "too_few") {
    const top = topCoffees(archive, SHOWN + seen.size)
      .filter((coffee) => !seen.has(coffee.id))
      .slice(0, 8)
      .flatMap((coffee) => rowFor(archive, coffee.id, r.topTitle) ?? []);
    return (
      <>
        <p className="border-b border-border py-4 text-muted-foreground">
          {format(r.tooFew, { min: RECOMMEND_MIN_SCORED, count: result.scored })}
        </p>
        <RecommendationList rows={top} label={r.topTitle} />
      </>
    );
  }

  const rows = result.items.flatMap((item) => {
    const reason =
      item.reason.kind === "tags"
        ? format(r.reasons.tags, {
            tags: item.reason.tags.map((slug) => tagNames.get(slug) ?? slug).join(", "),
          })
        : item.reason.kind === "together"
          ? format(r.reasons.together, {
              via: coffeeName(item.reason.via),
              count: item.reason.members,
            })
          : r.reasons.taste;
    return rowFor(archive, item.coffeeId, reason) ?? [];
  });

  if (rows.length === 0) {
    return <p className="border-b border-border py-8 text-muted-foreground">{r.empty}</p>;
  }
  return (
    <>
      <p className="border-b border-border py-3 font-mono text-xs text-muted-foreground">
        {r.fromSite}
      </p>
      <RecommendationList rows={rows} label={r.listLabel} />
    </>
  );
}

export default function RecommendationsPage() {
  return (
    <PageShell>
      <PageHeading title={r.title} aside={<p>{r.description}</p>} lead={r.lead} />
      <SectionHeading index={1} title={r.listLabel} />
      <Suspense fallback={<Skeleton className="mt-6 h-96" />}>
        <Recommendations />
      </Suspense>
      <section aria-labelledby="nasil" className="mt-8 max-w-[62ch]">
        <SectionHeading id="nasil" index={2} title={r.howTitle} />
        <p className="py-4 text-sm leading-relaxed">{r.how}</p>
      </section>
    </PageShell>
  );
}
