import { SCORE_MAX, SCORE_MIN } from "@espressoir/core";
import Link from "next/link";

import { ScoreBadge } from "@/components/coffee/score-badge";
import { TastingItem } from "@/components/coffee/tasting-item";
import { FieldStrip, type Field } from "@/components/site/field-strip";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { getArchive } from "@/lib/data/archive";
import { homeSummary, loggedTastings, methodCounts, topCoffees } from "@/lib/data/selectors";
import { formatAverage, formatMonth } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { brandPath, coffeePath } from "@/lib/routes";
import { cn } from "@/lib/utils";

const scale = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i);
const LATEST_COUNT = 8;
const TOP_COUNT = 5;

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

export default async function HomePage() {
  const archive = await getArchive();
  const summary = homeSummary(archive);
  const latest = loggedTastings(archive).slice(0, LATEST_COUNT);
  const top = topCoffees(archive, TOP_COUNT);
  const methods = methodCounts(archive);
  const empty = summary.tastingCount === 0;

  const fields: Field[] = [
    {
      label: t.home.fields.tastings,
      value: empty ? "—" : summary.tastingCount,
      note:
        summary.firstTastedAt && summary.lastTastedAt
          ? format(t.home.fieldNotes.tastings, {
              first: formatMonth(summary.firstTastedAt.slice(0, 7)),
              last: formatMonth(summary.lastTastedAt.slice(0, 7)),
            })
          : t.home.fieldEmpty,
      empty,
    },
    {
      label: t.home.fields.coffees,
      value: summary.coffeeCount === 0 ? "—" : summary.coffeeCount,
      note:
        summary.coffeeCount === 0
          ? t.home.fieldEmpty
          : summary.wishlistCount > 0
            ? format(t.home.fieldNotes.coffees, { count: summary.wishlistCount })
            : t.home.fieldNotes.coffeesAllTasted,
      empty: summary.coffeeCount === 0,
    },
    {
      label: t.home.fields.brands,
      value: summary.brandCount === 0 ? "—" : summary.brandCount,
      note: summary.topBrand
        ? format(t.home.fieldNotes.brands, {
            brand: summary.topBrand.name,
            count: summary.topBrand.count,
          })
        : t.home.fieldEmpty,
      empty: summary.brandCount === 0,
    },
    {
      label: t.home.fields.average,
      value:
        summary.scores.mean === null
          ? "—"
          : formatAverage(Math.round(summary.scores.mean * 10) / 10),
      note:
        summary.scores.median === null
          ? t.home.fieldEmpty
          : format(t.home.fieldNotes.average, {
              n: summary.scores.n,
              median: formatAverage(summary.scores.median),
            }),
      empty: summary.scores.mean === null,
    },
  ];

  return (
    <PageShell>
      <section className="grid gap-5 border-b border-rule pt-9 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <h1 className="font-wide text-[clamp(3.25rem,10.5vw,8.9rem)] leading-[0.84] font-extrabold tracking-[-0.035em] uppercase">
          {t.home.title}
          <span className="text-brand">.</span>
        </h1>
        <div className="max-w-sm font-mono text-xs leading-relaxed text-muted-foreground md:text-right">
          <p className="text-foreground">{t.home.intro}</p>
          <p className="mt-2">{t.home.methodsLine}</p>
        </div>
      </section>

      <FieldStrip fields={fields} />

      <div className="grid md:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="son-tadimlar" className="md:border-r md:border-rule md:pr-6">
          <SectionHeading
            id="son-tadimlar"
            index={1}
            title={t.home.latestTitle}
            aside={
              empty ? undefined : (
                <Link href="/kahveler" className={linkFocus}>
                  {t.home.latestAll} →
                </Link>
              )
            }
          />
          {empty ? (
            <ol aria-label={t.home.latestTitle}>
              {[0, 1, 2].map((row) => (
                <li
                  key={row}
                  aria-hidden={row > 0}
                  className="grid grid-cols-[minmax(0,1fr)_54px] gap-4 border-b border-border py-4"
                >
                  <div className="space-y-2.5">
                    <div className="h-3 w-24 border-b border-dashed border-input" />
                    <div className="h-6 w-2/3 border-b border-dashed border-input" />
                    {row === 0 ? (
                      <p className="max-w-[62ch] pt-1 text-[0.9rem] text-muted-foreground">
                        {t.home.latestEmpty}
                      </p>
                    ) : (
                      <div className="h-4 w-5/6 border-b border-dashed border-input" />
                    )}
                  </div>
                  <ScoreBadge score={null} />
                </li>
              ))}
            </ol>
          ) : (
            <ol aria-label={t.home.latestTitle}>
              {latest.map((tasting) => (
                <TastingItem key={tasting.id} tasting={tasting} showCoffee clampNotes />
              ))}
            </ol>
          )}
        </section>

        <aside className="md:pl-6">
          {top.length > 0 ? (
            <>
              <SectionHeading index={2} title={t.home.topTitle} />
              <ol aria-label={t.home.topTitle}>
                {top.map((coffee) => (
                  <li
                    key={coffee.id}
                    className="flex items-center justify-between gap-3 border-b border-border py-2.5"
                  >
                    <div className="min-w-0">
                      <Link
                        href={coffeePath(coffee.brand.slug, coffee.slug)}
                        className={cn(
                          "font-semiwide block leading-snug font-bold [overflow-wrap:anywhere]",
                          linkFocus,
                        )}
                      >
                        {coffee.name}
                      </Link>
                      <Link
                        href={brandPath(coffee.brand.slug)}
                        className={cn("font-mono text-xs text-muted-foreground", linkFocus)}
                      >
                        {coffee.brand.name}
                      </Link>
                    </div>
                    <ScoreBadge score={coffee.stats.avgScore} size="sm" />
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          <SectionHeading
            index={top.length > 0 ? 3 : 2}
            title={t.home.scaleTitle}
            aside="1–10"
            className={top.length > 0 ? "mt-6" : undefined}
          />
          <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {t.home.scaleBody}
          </p>
          <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label={t.home.scaleTitle}>
            {scale.map((score) => (
              <li key={score}>
                <ScoreBadge score={score} size="sm" className="w-full" />
              </li>
            ))}
          </ol>

          <SectionHeading
            index={top.length > 0 ? 4 : 3}
            title={t.home.methodsTitle}
            className="mt-6"
          />
          <ul className="font-mono text-[0.8rem]">
            {methods.map(({ method, count }) => (
              <li
                key={method.slug}
                className="flex items-center gap-2.5 border-b border-border py-2"
              >
                {/* A ticked box for methods already in the notebook, an empty one for the rest. */}
                <span
                  aria-hidden
                  className={cn(
                    "size-3 border-[1.5px] border-foreground",
                    count > 0 && "bg-foreground",
                  )}
                />
                <span className="flex-1">{method.name}</span>
                {count > 0 ? (
                  <span className="text-muted-foreground tabular-nums">{count}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mono text-xs text-muted-foreground">{t.home.methodsBody}</p>
        </aside>
      </div>
    </PageShell>
  );
}
