import { cityByCode, TR_CITIES } from "@espressoir/core";
import type { Metadata } from "next";
import { ExternalLinkIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BusinessBlock } from "@/components/business/business-block";
import { VisitCard } from "@/components/cafe/visit-item";
import { ScoreBadge } from "@/components/coffee/score-badge";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { ReportButton } from "@/components/social/report-button";
import { DataTable } from "@/components/stats/data-table";
import { GroupMeans } from "@/components/stats/group-means";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { getArchive } from "@/lib/data/archive";
import { getCurrentYear } from "@/lib/data/today";
import { cafeHref, drinkMeans, findCafe, placeOf, visitsAt } from "@/lib/data/cafes";
import { formatAverage, formatDay, formatDecimal } from "@/lib/format";
import { format, t } from "@/lib/i18n";

type Props = PageProps<"/kafe/[sehir]/[kafe]">;

const c = t.cafes;

// py-2 makes the small breadcrumb links tall enough to tap.
// py-2 makes the small breadcrumb links tall enough to tap.
const crumb = "inline-block py-2 text-ink-2 underline underline-offset-3 hover:text-ink";

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
  const currentYear = await getCurrentYear();

  return (
    <>
      <PageHeading
        title={cafe.name}
        kicker={
          <nav aria-label={c.breadcrumb}>
            <Link href="/kafeler" className={crumb}>
              {t.nav.cafes}
            </Link>
            {" / "}
            <Link href={`/kafeler?sehir=${city?.slug ?? ""}` as Route} className={crumb}>
              {city?.name}
            </Link>
          </nav>
        }
      >
        <ScoreBadge score={cafe.avgScore} />
        <p className="type-meta">
          {cafe.visitCount === 0
            ? c.noVisits
            : [
                format(c.visitCount, { count: cafe.visitCount }),
                cafe.lastVisitedOn ? `${c.lastVisit}: ${formatDay(cafe.lastVisitedOn)}` : null,
                cafe.visitCount > 1
                  ? `${c.average}, ${format(c.ratedBy, { n: cafe.visitCount })}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </p>
      </PageHeading>

      {cafe.isReviewed ? null : (
        <p role="note" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 type-meta">
          <Chip>{c.unreviewed}</Chip>
          {c.unreviewedNote}
        </p>
      )}

      <div className="mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="type-meta">
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
                className="inline-flex items-center gap-1 text-accent-ink underline underline-offset-3"
              >
                {c.map}
                <ExternalLinkIcon aria-hidden className="size-4 stroke-[1.5]" />
              </a>
            </>
          ) : null}
        </p>
        <Button asChild variant="secondary">
          <Link href={`/panel/kafe/yeni/${cafe.id}` as Route} prefetch={false}>
            {c.wasHere}
          </Link>
        </Button>
      </div>
      <BusinessBlock
        description={cafe.description}
        website={cafe.website}
        officialUsername={cafe.officialUsername}
        claimHref={`/panel/isletme/basvuru/kafe/${cafe.id}` as Route}
      />

      <Section id="ziyaretler" className="mt-0 md:mt-0">
        <SectionHeading id="ziyaretler" title={c.visitsTitle} hint={c.visitsHint} />
        {visits.length === 0 ? (
          <p className="text-ink-2">{c.notVisitedYet}</p>
        ) : (
          <ol aria-labelledby="ziyaretler" className="grid gap-4 md:grid-cols-2">
            {visits.map((visit) => (
              <li key={visit.id}>
                <VisitCard visit={visit} currentYear={currentYear} showAuthor />
              </li>
            ))}
          </ol>
        )}
      </Section>

      {drinks.length > 0 ? (
        <Section id="icecekler" className="max-w-3xl">
          <SectionHeading id="icecekler" title={c.drinksTitle} hint={c.drinksHint} />
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
        </Section>
      ) : null}

      {/* A wrong name or place, a duplicate, a made-up café: members can point it out. */}
      <ReportButton target="cafe" targetId={cafe.id} className="mt-12" />
    </>
  );
}
