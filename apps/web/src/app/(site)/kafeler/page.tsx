import { cityByCode } from "@espressoir/core";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CafeExplorer } from "@/components/cafe/cafe-explorer";
import { CafeList } from "@/components/cafe/cafe-list";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { getArchive } from "@/lib/data/archive";
import { toCafeCards } from "@/lib/data/cafes";
import { format, t } from "@/lib/i18n";

const c = t.cafes;

export const metadata: Metadata = {
  title: c.title,
  description: c.description,
  alternates: { canonical: "/kafeler" },
};

export default async function CafesPage() {
  const { cafes } = await getArchive();
  const cards = toCafeCards(cafes);
  const cities = [...new Set(cafes.map((cafe) => cafe.cityCode))]
    .flatMap((code) => {
      const city = cityByCode(code);
      return city ? [{ slug: city.slug, name: city.name }] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));

  return (
    <PageShell>
      <PageHeading title={c.title} lead={c.lead}>
        {/* The form is behind the sign-in; signed-out visitors land on the login first. */}
        <Button asChild>
          <Link href="/panel/kafe/yeni" prefetch={false}>
            {c.add}
          </Link>
        </Button>
      </PageHeading>
      {cards.length === 0 ? (
        <p className="text-ink-2">{c.emptyArchive}</p>
      ) : (
        // As on the coffee list: the complete list is prerendered, and the filters take
        // over once the browser knows the URL.
        <Suspense
          fallback={
            <div>
              <p className="pb-6 type-meta">{format(c.resultCount, { count: cards.length })}</p>
              <CafeList cafes={cards} heading="h2" label={c.title} />
            </div>
          }
        >
          <CafeExplorer cafes={cards} cities={cities} />
        </Suspense>
      )}
    </PageShell>
  );
}
