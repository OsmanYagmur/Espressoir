import type { Metadata } from "next";
import { Suspense } from "react";

import { CoffeeExplorer, type ExplorerOptions } from "@/components/coffee/coffee-explorer";
import { CoffeeList } from "@/components/coffee/coffee-list";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { DEFAULT_COFFEE_FILTER, filterCoffees } from "@espressoir/core";
import { toCoffeeCards, type CoffeeCard } from "@/lib/coffee-cards";
import { getArchive } from "@/lib/data/archive";
import { toListItems } from "@/lib/data/selectors";
import { format, t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.coffees.title,
  description: t.coffees.description,
  alternates: { canonical: "/kahveler" },
};

export default async function CoffeesPage() {
  const archive = await getArchive();
  const coffees = toCoffeeCards(
    filterCoffees(toListItems(archive), DEFAULT_COFFEE_FILTER),
    archive.brewMethods,
  ) as CoffeeCard[];

  const usedMethods = new Set(coffees.flatMap((coffee) => coffee.brewMethodSlugs));
  const options: ExplorerOptions = {
    brands: [...new Map(coffees.map((coffee) => [coffee.brandSlug, coffee.brandName]))]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr")),
    methods: archive.brewMethods
      .filter((method) => usedMethods.has(method.slug))
      .map(({ slug, name }) => ({ slug, name })),
    years: [...new Set(coffees.flatMap((coffee) => coffee.tastedYears))].sort((a, b) => b - a),
  };

  return (
    <PageShell>
      <PageHeading title={t.coffees.title} lead={t.coffees.lead} />
      {coffees.length === 0 ? (
        <p className="text-ink-2">{t.coffees.emptyArchive}</p>
      ) : (
        // The explorer reads the URL, which only exists in the browser. Until it takes
        // over, the page already shows the complete list: that is what gets prerendered,
        // and what search engines and no-JS visitors see.
        <Suspense
          fallback={
            <div>
              <p className="pb-6 type-meta">
                {format(t.coffees.resultCount, { count: coffees.length })}
              </p>
              <CoffeeList coffees={coffees} heading="h2" label={t.coffees.title} />
            </div>
          }
        >
          <CoffeeExplorer coffees={coffees} options={options} />
        </Suspense>
      )}
    </PageShell>
  );
}
