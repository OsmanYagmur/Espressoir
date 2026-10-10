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

import { FieldStrip } from "@/components/site/field-strip";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { DataTable } from "@/components/stats/data-table";
import { GroupMeans, type GroupRow } from "@/components/stats/group-means";
import { ScatterPlot } from "@/components/stats/scatter-plot";
import { ScoreColumns } from "@/components/stats/score-columns";
import { Timeline } from "@/components/stats/timeline";
import { getArchive } from "@/lib/data/archive";
import { loggedTastings, scoresOf } from "@/lib/data/selectors";
import { formatAverage, formatDecimal, formatMonth } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { brandPath } from "@/lib/routes";

export const metadata: Metadata = {
  title: t.stats.title,
  description: t.stats.description,
  alternates: { canonical: "/istatistik" },
};

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
        <PageHeading title={t.stats.title} />
        <p className="border-b border-border py-10 text-muted-foreground">{t.stats.empty}</p>
      </PageShell>
    );
  }

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
      <PageHeading title={t.stats.title} aside={<p>{t.stats.intro}</p>} />

      <FieldStrip
        fields={[
          {
            label: t.stats.summary.n,
            value: summary.n,
            note: unrated > 0 ? format(t.stats.summary.unrated, { count: unrated }) : undefined,
          },
          { label: t.stats.summary.mean, value: formatDecimal(summary.mean!) },
          { label: t.stats.summary.median, value: formatAverage(summary.median!) },
          {
            label: t.stats.summary.sd,
            value: summary.sd === null ? "—" : formatDecimal(summary.sd),
            note: t.stats.summary.sample,
            empty: summary.sd === null,
          },
          {
            label: t.stats.summary.range,
            value: format(t.stats.summary.rangeValue, { min: summary.min!, max: summary.max! }),
          },
        ]}
      />

      <div className="grid gap-x-12 md:grid-cols-2">
        <section aria-labelledby="dagilim">
          <SectionHeading
            id="dagilim"
            index={1}
            title={t.stats.distributionTitle}
            aside={format(t.coffee.ratedBy, { n: summary.n })}
          />
          <p className="mt-3 font-mono text-xs text-muted-foreground">{t.stats.distributionNote}</p>
          <ScoreColumns counts={histogram} className="mt-4 mb-7" />
          <DataTable
            caption={t.stats.distributionTitle}
            columns={[t.stats.columns.score, t.stats.columns.count]}
            rows={histogram.map((count, index) => [SCORE_MIN + index, count])}
          />
        </section>

        <section aria-labelledby="zaman">
          <SectionHeading
            id="zaman"
            index={2}
            title={t.stats.timelineTitle}
            aside={format(t.coffee.ratedBy, {
              n: months.reduce((sum, entry) => sum + entry.count, 0),
            })}
          />
          <p className="mt-3 font-mono text-xs text-muted-foreground">{t.stats.timelineNote}</p>
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
        </section>
      </div>

      <section aria-labelledby="markalar" className="mt-8">
        <SectionHeading
          id="markalar"
          index={3}
          title={t.stats.brandsTitle}
          aside={t.stats.axis.score}
        />
        <p className="mt-3 mb-1 font-mono text-xs text-muted-foreground">{t.stats.groupNote}</p>
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
      </section>

      <div className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
        <section aria-labelledby="formlar">
          <SectionHeading id="formlar" index={4} title={t.stats.formsTitle} />
          <GroupMeans caption={t.stats.formsTitle} groupLabel={t.stats.columns.form} rows={forms} />
          <DataTable
            caption={t.stats.formsTitle}
            columns={[t.stats.columns.form, ...groupColumns]}
            rows={tableRows(forms)}
          />
        </section>

        <section aria-labelledby="yontemler">
          <SectionHeading id="yontemler" index={5} title={t.stats.methodsTitle} />
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
        </section>
      </div>

      <section aria-labelledby="yogunluk" className="mt-8">
        <SectionHeading
          id="yogunluk"
          index={6}
          title={t.stats.scatterTitle}
          aside={format(t.coffee.ratedBy, {
            n: points.reduce((sum, point) => sum + point.count, 0),
          })}
        />
        <p className="mt-3 mb-4 max-w-[72ch] font-mono text-xs leading-relaxed text-muted-foreground">
          {t.stats.scatterNote}
        </p>
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
          <p className="border-b border-border pb-6 text-muted-foreground">
            {t.stats.scatterEmpty}
          </p>
        )}
      </section>
    </PageShell>
  );
}
