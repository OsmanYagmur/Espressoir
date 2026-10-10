import { DEFAULT_COFFEE_FILTER, filterCoffees } from "@espressoir/core";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CoffeeList } from "@/components/coffee/coffee-list";
import { FieldStrip } from "@/components/site/field-strip";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { SectionHeading } from "@/components/site/section-heading";
import { toCoffeeCards } from "@/lib/coffee-cards";
import { getArchive } from "@/lib/data/archive";
import { brandSummaries, toListItems } from "@/lib/data/selectors";
import { formatAverage, formatDecimal } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { brandPath, coffeePath } from "@/lib/routes";

type Props = PageProps<"/marka/[slug]">;

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

export async function generateStaticParams() {
  const brands = brandSummaries(await getArchive());
  if (brands.length === 0) return [{ slug: "-" }];
  return brands.map((brand) => ({ slug: brand.slug }));
}

async function findBrand(slug: string) {
  const archive = await getArchive();
  const brand = brandSummaries(archive).find((candidate) => candidate.slug === slug);
  return { archive, brand };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { brand } = await findBrand(slug);
  if (!brand) return {};

  const values = { brand: brand.name, coffees: brand.coffees.length, tastings: brand.tastingCount };
  const description =
    brand.scores.mean === null
      ? format(t.brand.metaUnrated, values)
      : format(t.brand.metaRated, { ...values, average: formatDecimal(brand.scores.mean) });
  return {
    title: brand.name,
    description,
    alternates: { canonical: brandPath(brand.slug) },
    openGraph: { title: brand.name, description, url: brandPath(brand.slug) },
  };
}

export default function BrandPage({ params }: Props) {
  return (
    <PageShell>
      <Suspense fallback={<PageSkeleton />}>
        <BrandDetail params={params} />
      </Suspense>
    </PageShell>
  );
}

async function BrandDetail({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const { archive, brand } = await findBrand(slug);
  if (!brand) notFound();

  const coffees = toCoffeeCards(
    filterCoffees(toListItems({ ...archive, coffees: brand.coffees }), {
      ...DEFAULT_COFFEE_FILTER,
      sort: "score_desc",
    }),
    archive.brewMethods,
  );

  return (
    <>
      <PageHeading
        plain
        title={brand.name}
        kicker={
          <nav aria-label={t.coffeeDetail.breadcrumb}>
            <Link href="/kahveler" className={linkFocus}>
              {t.nav.coffees}
            </Link>
            {" / "}
            {t.brand.label}
          </nav>
        }
      />
      <FieldStrip
        fields={[
          { label: t.brand.fields.coffees, value: brand.coffees.length },
          {
            label: t.brand.fields.tastings,
            value: brand.tastingCount === 0 ? "—" : brand.tastingCount,
            empty: brand.tastingCount === 0,
          },
          {
            label: t.brand.fields.average,
            value: brand.scores.mean === null ? "—" : formatDecimal(brand.scores.mean),
            note:
              brand.scores.mean === null
                ? undefined
                : format(t.coffee.ratedBy, { n: brand.scores.n }),
            empty: brand.scores.mean === null,
          },
          {
            label: t.brand.fields.best,
            value: brand.best ? formatAverage(brand.best.stats.avgScore!) : "—",
            note: brand.best ? (
              <Link href={coffeePath(brand.slug, brand.best.slug)} className={linkFocus}>
                {brand.best.name}
              </Link>
            ) : undefined,
            empty: !brand.best,
          },
        ]}
      />
      <section aria-labelledby="kahveleri">
        <SectionHeading id="kahveleri" index={1} title={t.brand.coffeesTitle} />
        <CoffeeList coffees={coffees} showBrand={false} label={t.brand.coffeesTitle} />
      </section>
    </>
  );
}
