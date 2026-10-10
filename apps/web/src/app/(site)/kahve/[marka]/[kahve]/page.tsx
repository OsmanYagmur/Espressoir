import type { Coffee, Tasting } from "@espressoir/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CoffeeList } from "@/components/coffee/coffee-list";
import { ScoreBadge } from "@/components/coffee/score-badge";
import { TastingItem } from "@/components/coffee/tasting-item";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { SectionHeading } from "@/components/site/section-heading";
import { ScoreColumns } from "@/components/stats/score-columns";
import { toCoffeeCards } from "@/lib/coffee-cards";
import { getArchive } from "@/lib/data/archive";
import { findCoffee, similarCoffees, tastingsOf, toListItems } from "@/lib/data/selectors";
import { countryName, formatAverage, formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { brandPath, coffeePath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";

type Props = PageProps<"/kahve/[marka]/[kahve]">;

const SIMILAR_COUNT = 4;

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

// Every coffee gets its own prerendered page. A coffee added later is rendered on its
// first visit and stored. The placeholder keeps an empty archive buildable (it renders
// the 404 page).
export async function generateStaticParams() {
  const { coffees } = await getArchive();
  if (coffees.length === 0) return [{ marka: "-", kahve: "-" }];
  return coffees.map((coffee) => ({ marka: coffee.brand.slug, kahve: coffee.slug }));
}

/** The label/value pairs printed on the coffee's "label". Unknown values are left out. */
function details(coffee: Coffee): { label: string; value: string; hint?: string }[] {
  const rows: ({ label: string; value: string; hint?: string } | null)[] = [
    coffee.form ? { label: t.coffee.fields.form, value: t.coffee.forms[coffee.form] } : null,
    coffee.capsuleSystem
      ? {
          label: t.coffee.fields.capsuleSystem,
          value: t.coffee.capsuleSystems[coffee.capsuleSystem],
        }
      : null,
    coffee.brandIntensity !== null
      ? {
          label: t.coffee.fields.intensity,
          value: String(coffee.brandIntensity),
          hint: t.coffee.intensityHint,
        }
      : null,
    coffee.originCountry
      ? { label: t.coffee.fields.origin, value: countryName(coffee.originCountry) }
      : null,
    coffee.region ? { label: t.coffee.fields.region, value: coffee.region } : null,
    coffee.process
      ? { label: t.coffee.fields.process, value: t.coffee.processes[coffee.process] }
      : null,
    coffee.roastLevel
      ? { label: t.coffee.fields.roast, value: t.coffee.roastLevels[coffee.roastLevel] }
      : null,
    coffee.isBlend !== null
      ? {
          label: t.coffee.fields.blend,
          value: coffee.isBlend ? t.coffee.blendYes : t.coffee.blendNo,
        }
      : null,
  ];
  return rows.filter((row) => row !== null);
}

function summaryLine(coffee: Coffee): string {
  return details(coffee)
    .map((row) => `${row.label}: ${row.value}`)
    .join(" · ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { marka, kahve } = await params;
  const coffee = findCoffee(await getArchive(), marka, kahve);
  if (!coffee) return {};

  const values = { brand: coffee.brand.name, name: coffee.name, details: summaryLine(coffee) };
  const description = (
    coffee.stats.avgScore === null
      ? format(t.coffeeDetail.metaUnrated, values)
      : format(t.coffeeDetail.metaRated, { ...values, score: formatAverage(coffee.stats.avgScore) })
  ).trim();
  const title = `${coffee.brand.name} ${coffee.name}`;
  const canonical = coffeePath(coffee.brand.slug, coffee.slug);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "article", title, description, url: canonical },
  };
}

/**
 * schema.org Product with the tastings as Reviews, so search results can show the score.
 * "<" is escaped because the JSON is written into a <script> tag.
 */
function JsonLd({ coffee, tastings }: { coffee: Coffee; tastings: Tasting[] }) {
  const url = new URL(coffeePath(coffee.brand.slug, coffee.slug), getSiteUrl()).toString();
  const rated = tastings.filter((tasting) => tasting.score !== null);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${coffee.brand.name} ${coffee.name}`,
    category: "Coffee",
    brand: { "@type": "Brand", name: coffee.brand.name },
    url,
    ...(coffee.description ? { description: coffee.description } : {}),
    ...(coffee.originCountry ? { countryOfOrigin: coffee.originCountry } : {}),
    ...(coffee.stats.avgScore !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: coffee.stats.avgScore,
            bestRating: 10,
            worstRating: 1,
            ratingCount: coffee.stats.ratedCount,
          },
        }
      : {}),
    ...(rated.length > 0
      ? {
          review: rated.map((tasting) => ({
            "@type": "Review",
            author: {
              "@type": "Person",
              name: tasting.author.displayName ?? tasting.author.username,
            },
            ...(tasting.tastedAt ? { datePublished: tasting.tastedAt } : {}),
            ...(tasting.notes ? { reviewBody: tasting.notes } : {}),
            reviewRating: {
              "@type": "Rating",
              ratingValue: tasting.score,
              bestRating: 10,
              worstRating: 1,
            },
          })),
        }
      : {}),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

// The page itself does not read the URL: it renders at once with a placeholder, and the
// coffee streams into it. Prerendered coffees are complete in the static HTML either way.
export default function CoffeePage({ params }: Props) {
  return (
    <PageShell>
      <Suspense fallback={<PageSkeleton />}>
        <CoffeeDetail params={params} />
      </Suspense>
    </PageShell>
  );
}

async function CoffeeDetail({ params }: Pick<Props, "params">) {
  const { marka, kahve } = await params;
  const archive = await getArchive();
  const coffee = findCoffee(archive, marka, kahve);
  if (!coffee) notFound();

  const tastings = tastingsOf(archive, coffee.id);
  const logged = tastings.filter((tasting) => tasting.status === "logged");
  const similar = toCoffeeCards(
    toListItems({ ...archive, coffees: similarCoffees(archive, coffee, SIMILAR_COUNT) }),
    archive.brewMethods,
  );
  const rows = details(coffee);
  const { stats } = coffee;
  let section = 0;

  return (
    <>
      <JsonLd coffee={coffee} tastings={logged} />
      <PageHeading
        plain
        title={coffee.name}
        kicker={
          <nav aria-label={t.coffeeDetail.breadcrumb}>
            <Link href="/kahveler" className={linkFocus}>
              {t.nav.coffees}
            </Link>
            {" / "}
            {/* Brand names keep their own spelling: no CSS uppercasing. */}
            <Link href={brandPath(coffee.brand.slug)} className={`normal-case ${linkFocus}`}>
              {coffee.brand.name}
            </Link>
          </nav>
        }
        aside={
          <div className="flex items-end gap-4 md:justify-end">
            <p>
              {stats.tastingCount === 0 ? (
                t.coffee.wishlist
              ) : (
                <>
                  {format(t.coffee.tastingCount, { count: stats.tastingCount })}
                  {stats.lastTastedAt ? (
                    <>
                      <br />
                      {t.coffee.fields.lastTasted}: {formatDay(stats.lastTastedAt)}
                    </>
                  ) : null}
                  {stats.ratedCount > 1 ? (
                    <>
                      <br />
                      {t.coffee.fields.average}, {format(t.coffee.ratedBy, { n: stats.ratedCount })}
                    </>
                  ) : null}
                </>
              )}
            </p>
            <ScoreBadge score={stats.avgScore} size="lg" />
          </div>
        }
      />

      <div className="grid md:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="tadimlar" className="md:border-r md:border-rule md:pr-6">
          <SectionHeading id="tadimlar" index={++section} title={t.coffeeDetail.tastingsTitle} />
          {tastings.length === 0 ? (
            <p className="border-b border-border py-6 text-muted-foreground">
              {t.coffeeDetail.wishlistBody}
            </p>
          ) : (
            <ol aria-label={t.coffeeDetail.tastingsTitle}>
              {tastings.map((tasting) => (
                <TastingItem key={tasting.id} tasting={tasting} />
              ))}
            </ol>
          )}
        </section>

        <aside className="md:pl-6">
          {rows.length > 0 ? (
            <>
              <SectionHeading index={++section} title={t.coffeeDetail.detailsTitle} />
              <dl className="font-mono text-[0.8rem]">
                {rows.map((row) => (
                  <div key={row.label} className="border-b border-border py-2">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted-foreground">{row.label}</dt>
                      <dd className="text-right font-medium">{row.value}</dd>
                    </div>
                    {row.hint ? (
                      <dd className="mt-0.5 text-xs text-muted-foreground">{row.hint}</dd>
                    ) : null}
                  </div>
                ))}
              </dl>
            </>
          ) : null}

          {stats.ratedCount > 1 ? (
            <>
              <SectionHeading
                index={++section}
                title={t.coffeeDetail.distributionTitle}
                aside={format(t.coffee.ratedBy, { n: stats.ratedCount })}
                className={rows.length > 0 ? "mt-6" : undefined}
              />
              <ScoreColumns counts={stats.distribution} className="mt-2 mb-7 h-32" />
            </>
          ) : null}
        </aside>
      </div>

      {coffee.description ? (
        <p className="max-w-[62ch] border-b border-border py-5 whitespace-pre-line">
          {coffee.description}
        </p>
      ) : null}

      {similar.length > 0 ? (
        <section aria-labelledby="benzer" className="mt-8">
          <SectionHeading id="benzer" index={++section} title={t.coffeeDetail.similarTitle} />
          <CoffeeList coffees={similar} label={t.coffeeDetail.similarTitle} />
        </section>
      ) : null}
    </>
  );
}
