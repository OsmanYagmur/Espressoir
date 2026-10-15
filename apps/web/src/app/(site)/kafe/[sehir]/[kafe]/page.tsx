import { cityByCode, TR_CITIES } from "@espressoir/core";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { VisitItem } from "@/components/cafe/visit-item";
import { ScoreBadge } from "@/components/coffee/score-badge";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { SectionHeading } from "@/components/site/section-heading";
import { ReportButton } from "@/components/social/report-button";
import { DataTable } from "@/components/stats/data-table";
import { GroupMeans } from "@/components/stats/group-means";
import { Button } from "@/components/ui/button";
import { getArchive } from "@/lib/data/archive";
import { cafeHref, drinkMeans, findCafe, placeOf, visitsAt } from "@/lib/data/cafes";
import { formatAverage, formatDay, formatDecimal } from "@/lib/format";
import { format, t } from "@/lib/i18n";

type Props = PageProps<"/kafe/[sehir]/[kafe]">;

const c = t.cafes;

// py-1.5 makes the small breadcrumb links tall enough to tap.
const linkFocus =
  "inline-block py-1.5 underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

// Every café gets its own prerendered page; one added later is rendered on its first visit
// and stored. The placeholder keeps an archive without cafés buildable (it renders the 404).
export async function generateStaticParams() {
  const { cafes } = await getArchive();
  if (cafes.length === 0) return [{ sehir: "-", kafe: "-" }];
  return cafes.map((cafe) => ({
    sehir: cityByCode(cafe.cityCode)?.slug ?? "-",
    kafe: cafe.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sehir, kafe } = await params;
  const cafe = findCafe(await getArchive(), sehir, kafe);
  if (!cafe) return {};

  const values = { place: placeOf(cafe), name: cafe.name, count: cafe.visitCount };
  const description =
    cafe.avgScore === null
      ? format(c.metaUnrated, values)
      : format(c.metaRated, { ...values, score: formatAverage(cafe.avgScore) });
  const canonical = cafeHref(cafe);
  return {
    title: `${cafe.name} (${cityByCode(cafe.cityCode)?.name ?? ""})`,
    description,
    alternates: { canonical },
    openGraph: { type: "article", title: cafe.name, description, url: canonical },
  };
}

export default function CafePage({ params }: Props) {
  return (
    <PageShell>
      <Suspense fallback={<PageSkeleton />}>
        <CafeDetail params={params} />
      </Suspense>
    </PageShell>
  );
}

async function CafeDetail({ params }: Pick<Props, "params">) {
  const { sehir, kafe } = await params;
  const archive = await getArchive();
  const cafe = findCafe(archive, sehir, kafe);
  if (!cafe) notFound();

  const city = TR_CITIES.find((candidate) => candidate.code === cafe.cityCode);
  const visits = visitsAt(archive, cafe.id);
  const drinks = drinkMeans(visits);
  let section = 0;

  return (
    <>
      <PageHeading
        plain
        title={cafe.name}
        kicker={
          <nav aria-label={c.breadcrumb}>
            <Link href="/kafeler" className={linkFocus}>
              {t.nav.cafes}
            </Link>
            {" / "}
            <Link href={`/kafeler?sehir=${city?.slug ?? ""}` as Route} className={linkFocus}>
              {city?.name}
            </Link>
          </nav>
        }
        aside={
          <div className="flex items-end gap-4 md:justify-end">
            <p>
              {cafe.visitCount === 0 ? (
                c.noVisits
              ) : (
                <>
                  {format(c.visitCount, { count: cafe.visitCount })}
                  {cafe.lastVisitedOn ? (
                    <>
                      <br />
                      {c.lastVisit}: {formatDay(cafe.lastVisitedOn)}
                    </>
                  ) : null}
                  {cafe.visitCount > 1 ? (
                    <>
                      <br />
                      {c.average}, {format(c.ratedBy, { n: cafe.visitCount })}
                    </>
                  ) : null}
                </>
              )}
            </p>
            <ScoreBadge score={cafe.avgScore} size="lg" />
          </div>
        }
      />

      {cafe.isReviewed ? null : (
        <p role="note" className="border-b border-rule py-3 font-mono text-xs leading-relaxed">
          <span className="mr-2 border border-foreground px-1.5 py-0.5 uppercase">
            {c.unreviewed}
          </span>
          {c.unreviewedNote}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-border py-3">
        <p className="font-mono text-sm">
          {placeOf(cafe)}
          {cafe.mapUrl ? (
            <>
              {" · "}
              {/* A member's link to another site: no referrer, no ranking credit. */}
              <a
                href={cafe.mapUrl}
                target="_blank"
                rel="nofollow ugc noopener noreferrer"
                title={c.mapNote}
                className="underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {c.map} ↗
              </a>
            </>
          ) : null}
        </p>
        <Button asChild variant="outline" className="h-11 font-mono text-xs uppercase">
          <Link href={`/panel/kafe/yeni/${cafe.id}` as Route} prefetch={false}>
            {c.wasHere}
          </Link>
        </Button>
      </div>
      {/* A wrong name or place, a duplicate, a made-up café: members can point it out. */}
      <ReportButton target="cafe" targetId={cafe.id} className="border-b border-border py-2" />

      <section aria-labelledby="ziyaretler">
        <SectionHeading
          id="ziyaretler"
          index={++section}
          title={c.visitsTitle}
          hint={c.visitsHint}
        />
        {visits.length === 0 ? (
          <p className="border-b border-border py-6 text-muted-foreground">{c.notVisitedYet}</p>
        ) : (
          <ol aria-label={c.visitsTitle}>
            {visits.map((visit) => (
              <VisitItem key={visit.id} visit={visit} showAuthor />
            ))}
          </ol>
        )}
      </section>

      {/* Under the visits, at full width: ten score ticks need the room. */}
      {drinks.length > 0 ? (
        <section aria-labelledby="icecekler" className="mt-8 max-w-3xl">
          <SectionHeading
            id="icecekler"
            index={++section}
            title={c.drinksTitle}
            hint={c.drinksHint}
            aside={t.stats.axis.score}
          />
          <p className="mt-3 mb-1 font-mono text-xs text-muted-foreground">{t.stats.groupNote}</p>
          <GroupMeans
            caption={format(c.drinksCaption, { cafe: cafe.name })}
            groupLabel={c.drinkColumn}
            rows={drinks}
          />
          <DataTable
            caption={format(c.drinksCaption, { cafe: cafe.name })}
            columns={[
              c.drinkColumn,
              t.stats.columns.n,
              t.stats.columns.mean,
              t.stats.columns.min,
              t.stats.columns.max,
            ]}
            rows={drinks.map((drink) => [
              drink.label,
              drink.n,
              formatDecimal(drink.mean!),
              drink.min!,
              drink.max!,
            ])}
          />
        </section>
      ) : null}
    </>
  );
}
