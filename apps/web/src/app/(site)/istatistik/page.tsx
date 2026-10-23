import {
  countPoints,
  monthlyCounts,
  scoreHistogram,
  SCORE_MIN,
  summarize,
  summarizeBy,
  type GroupSummary,
} from "@espressoir/core";
import type { Tasting } from "@espressoir/db";
import type { Metadata } from "next";
import Link from "next/link";

import { ScoreBadge } from "@/components/coffee/score-badge";
import { FieldStrip, type Field } from "@/components/site/field-strip";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { DataTable } from "@/components/stats/data-table";
import { GroupMeans, type GroupRow } from "@/components/stats/group-means";
import { ScatterPlot } from "@/components/stats/scatter-plot";
import { ScoreColumns } from "@/components/stats/score-columns";
import { Timeline } from "@/components/stats/timeline";
import { getArchive } from "@/lib/data/archive";
import {
  homeSummary,
  loggedTastings,
  methodCounts,
  scoresOf,
  topCoffees,
} from "@/lib/data/selectors";
import { formatAverage, formatDecimal, formatMonth } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { brandPath, coffeePath } from "@/lib/routes";

export const metadata: Metadata = {
  title: t.stats.title,
  description: t.stats.description,
  alternates: { canonical: "/istatistik" },
};

const TOP_COUNT = 5;

function withLabels(
  groups: GroupSummary[],
  label: (key: string) => { label: string; href?: GroupRow["href"] },
): GroupRow[] {
  return groups.map((group) => ({ ...group, ...label(group.key) }));
}

const tableRows = (rows: GroupRow[]) =>
  rows.map((row) => [row.label, row.n, formatDecimal(row.mean!), row.min!, row.max!] as const);

export default async function StatsPage() {
  const archive = await getArchive();
  const logged = loggedTastings(archive);
  const scores = scoresOf(logged);
  const summary = summarize(scores);

  if (summary.n === 0) {
    return (
      <PageShell>
        <PageHeading title={t.stats.title} lead={t.stats.empty} />
      </PageShell>
    );
  }

  const archiveSummary = homeSummary(archive);
  const top = topCoffees(archive, TOP_COUNT);
  const methodUse = methodCounts(archive).filter(({ count }) => count > 0);

  const archiveFields: Field[] = [
    {
      label: t.stats.archive.tastings,
      value: archiveSummary.tastingCount,
      note:
        archiveSummary.firstTastedAt && archiveSummary.lastTastedAt
          ? format(t.stats.archive.tastingsNote, {
              first: formatMonth(archiveSummary.firstTastedAt.slice(0, 7)),
              last: formatMonth(archiveSummary.lastTastedAt.slice(0, 7)),
            })
          : undefined,
    },
    {
      label: t.stats.archive.coffees,
      value: archiveSummary.coffeeCount,
      note:
        archiveSummary.wishlistCount > 0
          ? format(t.stats.archive.coffeesNote, { count: archiveSummary.wishlistCount })
          : undefined,
    },
    {
      label: t.stats.archive.brands,
      value: archiveSummary.brandCount,
      note: archiveSummary.topBrand
        ? format(t.stats.archive.brandsNote, {
            brand: archiveSummary.topBrand.name,
            count: archiveSummary.topBrand.count,
          })
        : undefined,
    },
    {
      label: t.stats.archive.average,
      value: formatDecimal(summary.mean!),
      note: format(t.stats.archive.averageNote, {
        n: summary.n,
        median: formatAverage(summary.median!),
      }),
    },
  ];

  const score = (tasting: Tasting) => tasting.score;
  const brandNames = new Map(logged.map((tasting) => [tasting.brand.slug, tasting.brand.name]));
  const methodNames = new Map(archive.brewMethods.map((method) => [method.slug, method.name]));

  const brands = withLabels(
    summarizeBy(logged, (tasting) => tasting.brand.slug, score),
    (slug) => ({ label: brandNames.get(slug) ?? slug, href: brandPath(slug) }),
  );
  const forms = withLabels(
    summarizeBy(logged, (tasting) => tasting.coffee.form, score),
    (form) => ({ label: t.coffee.forms[form as keyof typeof t.coffee.forms] ?? form }),
  );
  const methods = withLabels(
    summarizeBy(logged, (tasting) => tasting.brewMethod?.slug ?? null, score),
    (slug) => ({ label: methodNames.get(slug) ?? slug }),
  );

  const histogram = scoreHistogram(scores);
  const points = countPoints(
    logged.flatMap((tasting) =>
      tasting.score !== null && tasting.coffee.brandIntensity !== null
        ? [{ x: tasting.coffee.brandIntensity, y: tasting.score }]
        : [],
    ),
  );
  const months = monthlyCounts(
    logged.flatMap((tasting) => (tasting.tastedAt ? [tasting.tastedAt] : [])),
  );
  const unrated = logged.length - summary.n;
  const groupColumns = [
    t.stats.columns.n,
    t.stats.columns.mean,
    t.stats.columns.min,
    t.stats.columns.max,
  ];

  return (
    <PageShell>
      <PageHeading title={t.stats.title} lead={t.stats.intro} />

      <FieldStrip fields={archiveFields} />

      <div className="grid gap-x-12 md:grid-cols-2">
        <Section id="en-yuksek">
          <SectionHeading id="en-yuksek" title={t.stats.topTitle} hint={t.stats.topHint} />
          <ol aria-labelledby="en-yuksek">
            {top.map((coffee) => (
              <li
                key={coffee.id}
                className="flex items-center justify-between gap-4 border-b border-line py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={coffeePath(coffee.brand.slug, coffee.slug)}
                    className="block font-display text-lg font-semibold [overflow-wrap:anywhere] text-ink no-underline hover:underline"
                  >
                    {coffee.name}
                  </Link>
                  <p className="type-meta">{coffee.brand.name}</p>
                </div>
                <ScoreBadge score={coffee.stats.avgScore} size="sm" />
              </li>
            ))}
          </ol>
        </Section>

        <Section id="yontem-sayilari">
          <SectionHeading
            id="yontem-sayilari"
            title={t.stats.methodCountsTitle}
            hint={t.stats.methodCountsHint}
          />
          <ul aria-labelledby="yontem-sayilari">
            {methodUse.map(({ method, count }) => (
              <li
                key={method.slug}
                className="flex items-baseline justify-between gap-3 border-b border-line py-3"
              >
                <span>{method.name}</span>
                <span className="type-figure text-ink-2">{count}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="grid gap-x-12 md:grid-cols-2">
        <Section id="dagilim">
          <SectionHeading
            id="dagilim"
            title={t.stats.distributionTitle}
            aside={
              <span className="type-figure">{format(t.coffee.ratedBy, { n: summary.n })}</span>
            }
            hint={t.stats.distributionNote}
          />
          <ScoreColumns counts={histogram} className="mt-4" />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 type-meta xs:grid-cols-4">
            <div>
              <dt>{t.stats.summary.median}</dt>
              <dd className="type-figure text-ink">{formatAverage(summary.median!)}</dd>
            </div>
            <div>
              <dt>{t.stats.summary.sd}</dt>
              <dd className="type-figure text-ink">
                {summary.sd === null ? "—" : formatDecimal(summary.sd)}
              </dd>
            </div>
            <div>
              <dt>{t.stats.summary.range}</dt>
              <dd className="type-figure text-ink">
                {format(t.stats.summary.rangeValue, { min: summary.min!, max: summary.max! })}
              </dd>
            </div>
            {unrated > 0 ? (
              <div>
                <dt>{t.stats.summary.unratedLabel}</dt>
                <dd className="type-figure text-ink">{unrated}</dd>
              </div>
            ) : null}
          </dl>
          <DataTable
            caption={t.stats.distributionTitle}
            columns={[t.stats.columns.score, t.stats.columns.count]}
            rows={histogram.map((count, index) => [SCORE_MIN + index, count])}
          />
        </Section>

        <Section id="zaman">
          <SectionHeading
            id="zaman"
            title={t.stats.timelineTitle}
            aside={
              <span className="type-figure">
                {format(t.coffee.ratedBy, {
                  n: months.reduce((sum, entry) => sum + entry.count, 0),
                })}
              </span>
            }
            hint={t.stats.timelineNote}
          />
          <div className="mt-4">
            <Timeline months={months} />
          </div>
          <DataTable
            caption={t.stats.timelineTitle}
            columns={[t.stats.columns.month, t.stats.columns.count]}
            rows={months
              .filter((entry) => entry.count > 0)
              .map((entry) => [formatMonth(entry.month), entry.count])}
          />
        </Section>
      </div>

      <Section id="markalar">
        <SectionHeading id="markalar" title={t.stats.brandsTitle} hint={t.stats.groupNote} />
        <GroupMeans
          caption={t.stats.brandsTitle}
          groupLabel={t.stats.columns.brand}
          rows={brands}
        />
        <DataTable
          caption={t.stats.brandsTitle}
          columns={[t.stats.columns.brand, ...groupColumns]}
          rows={tableRows(brands)}
        />
      </Section>

      <div className="grid gap-x-12 md:grid-cols-2">
        <Section id="formlar">
          <SectionHeading id="formlar" title={t.stats.formsTitle} />
          <GroupMeans caption={t.stats.formsTitle} groupLabel={t.stats.columns.form} rows={forms} />
          <DataTable
            caption={t.stats.formsTitle}
            columns={[t.stats.columns.form, ...groupColumns]}
            rows={tableRows(forms)}
          />
        </Section>

        <Section id="yontemler">
          <SectionHeading id="yontemler" title={t.stats.methodsTitle} />
          <GroupMeans
            caption={t.stats.methodsTitle}
            groupLabel={t.stats.columns.method}
            rows={methods}
          />
          <DataTable
            caption={t.stats.methodsTitle}
            columns={[t.stats.columns.method, ...groupColumns]}
            rows={tableRows(methods)}
          />
        </Section>
      </div>

      <Section id="yogunluk">
        <SectionHeading
          id="yogunluk"
          title={t.stats.scatterTitle}
          aside={
            <span className="type-figure">
              {format(t.coffee.ratedBy, {
                n: points.reduce((sum, point) => sum + point.count, 0),
              })}
            </span>
          }
          hint={t.stats.scatterNote}
        />
        {points.length > 0 ? (
          <>
            <ScatterPlot points={points} />
            <DataTable
              caption={t.stats.scatterTitle}
              columns={[t.stats.columns.intensity, t.stats.columns.score, t.stats.columns.count]}
              rows={points.map((point) => [point.x, point.y, point.count])}
            />
          </>
        ) : (
          <p className="text-ink-2">{t.stats.scatterEmpty}</p>
        )}
      </Section>
    </PageShell>
  );
}
