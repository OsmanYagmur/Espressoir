import type { Coffee, Tasting } from "@espressoir/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CoffeeList } from "@/components/coffee/coffee-list";
import { ScoreBadge } from "@/components/coffee/score-badge";
import { TasteProfile } from "@/components/coffee/taste-profile";
import { TastingCard } from "@/components/coffee/tasting-card";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { CoffeeActions } from "@/components/social/coffee-actions";
import { ReportButton } from "@/components/social/report-button";
import { ScoreColumns } from "@/components/stats/score-columns";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { TagCounts } from "@/components/stats/tag-counts";
import { toCoffeeCards } from "@/lib/coffee-cards";
import { getArchive } from "@/lib/data/archive";
import { findCoffee, similarCoffees, tastingsOf, toListItems } from "@/lib/data/selectors";
import { tasteSummary } from "@/lib/data/taste-summary";
import { getCurrentYear } from "@/lib/data/today";
import { countryName, formatAverage, formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { brandPath, coffeePath } from "@/lib/routes";
import { getSiteUrl } from "@/lib/site-url";

type Props = PageProps<"/kahve/[marka]/[kahve]">;

const SIMILAR_COUNT = 4;

// py-2 makes the small breadcrumb links tall enough to tap.
const crumb = "inline-block py-2 text-ink-2 underline underline-offset-3 hover:text-ink";

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
  const wanting = tastings.length - logged.length;
  const similar = toCoffeeCards(
    toListItems({ ...archive, coffees: similarCoffees(archive, coffee, SIMILAR_COUNT) }),
    archive.brewMethods,
  );
  const rows = details(coffee);
  const { stats } = coffee;
  const taste = tasteSummary(archive, logged);
  const currentYear = await getCurrentYear();

  return (
    <>
      <JsonLd coffee={coffee} tastings={logged} />
      <PageHeading
        title={coffee.name}
        kicker={
          <nav aria-label={t.coffeeDetail.breadcrumb}>
            <Link href="/kahveler" className={crumb}>
              {t.nav.coffees}
            </Link>
            {" / "}
            <Link href={brandPath(coffee.brand.slug)} className={crumb}>
              {coffee.brand.name}
            </Link>
          </nav>
        }
      >
        <ScoreBadge score={stats.avgScore} />
        <p className="type-meta">
          {stats.tastingCount === 0
            ? t.coffee.wishlist
            : [
                format(t.coffee.tastingCount, { count: stats.tastingCount }),
                stats.lastTastedAt
                  ? `${t.coffee.fields.lastTasted}: ${formatDay(stats.lastTastedAt)}`
                  : null,
                stats.ratedCount > 1
                  ? `${t.coffee.fields.average}, ${format(t.coffee.ratedBy, { n: stats.ratedCount })}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </p>
      </PageHeading>

      {coffee.isReviewed ? null : (
        // Added by a member and not checked by an admin yet: say so, in words.
        <p role="note" className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 type-meta">
          <Chip>{t.coffee.unreviewed}</Chip>
          {t.coffee.unreviewedNote}
        </p>
      )}
      <CoffeeActions coffeeId={coffee.id} />

      <div className="grid gap-x-12 md:grid-cols-[minmax(0,1fr)_340px]">
        <Section id="tadimlar">
          <SectionHeading id="tadimlar" title={t.coffeeDetail.tastingsTitle} />
          {logged.length === 0 ? (
            <p className="text-ink-2">{t.coffeeDetail.notTastedYet}</p>
          ) : (
            <ol aria-labelledby="tadimlar" className="flex flex-col gap-4">
              {logged.map((tasting) => (
                <li key={tasting.id}>
                  <TastingCard tasting={tasting} currentYear={currentYear} showCoffee={false} />
                </li>
              ))}
            </ol>
          )}
          {/* Wishlist entries are not tastings: they are counted, not listed. */}
          {wanting > 0 ? (
            <p className="mt-4 type-meta">{format(t.coffeeDetail.wantCount, { count: wanting })}</p>
          ) : null}
        </Section>

        <aside>
          {rows.length > 0 ? (
            <Section id="bilgiler">
              <SectionHeading id="bilgiler" title={t.coffeeDetail.detailsTitle} />
              <Card>
                <dl>
                  {rows.map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line py-2 first:pt-0 last:border-0 last:pb-0"
                    >
                      <dt className="type-meta">{row.label}</dt>
                      <dd className="text-right font-medium">{row.value}</dd>
                      {row.hint ? <dd className="mt-1 w-full type-meta">{row.hint}</dd> : null}
                    </div>
                  ))}
                </dl>
              </Card>
            </Section>
          ) : null}

          {stats.ratedCount > 1 ? (
            <Section id="dagilim">
              <SectionHeading
                id="dagilim"
                title={t.coffeeDetail.distributionTitle}
                aside={
                  <span className="type-figure">
                    {format(t.coffee.ratedBy, { n: stats.ratedCount })}
                  </span>
                }
              />
              <ScoreColumns counts={stats.distribution} className="h-32" />
            </Section>
          ) : null}

          {taste.profile ? (
            <Section id="tat-profili">
              <SectionHeading
                id="tat-profili"
                title={t.taste.community.title}
                hint={t.taste.community.hint}
              />
              <TasteProfile rows={taste.profile} />
            </Section>
          ) : null}

          {taste.tags.length > 0 ? (
            <Section id="tatlar">
              <SectionHeading
                id="tatlar"
                title={t.taste.community.tagsTitle}
                aside={
                  <span className="type-figure">
                    {format(t.taste.community.tagsAside, { n: taste.taggedCount })}
                  </span>
                }
                hint={t.taste.community.tagsHint}
              />
              <TagCounts
                tags={taste.tags}
                names={taste.names}
                caption={t.taste.community.tagsCaption}
              />
            </Section>
          ) : null}
        </aside>
      </div>

      {coffee.description ? (
        <p className="mt-12 max-w-read whitespace-pre-line">{coffee.description}</p>
      ) : null}

      {similar.length > 0 ? (
        <Section id="benzer">
          <SectionHeading id="benzer" title={t.coffeeDetail.similarTitle} />
          <CoffeeList coffees={similar} label={t.coffeeDetail.similarTitle} />
        </Section>
      ) : null}

      {/* Wrong brand, a duplicate, a made-up coffee: members can point it out. */}
      <ReportButton target="coffee" targetId={coffee.id} className="mt-12" />
    </>
  );
}
