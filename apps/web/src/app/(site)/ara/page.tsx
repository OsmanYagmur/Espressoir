import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SearchBox } from "@/components/search/search-box";
import { getArticles, isGuide } from "@/lib/data/articles";
import { getSearchIndex } from "@/lib/data/search-index";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.search.title,
  description: t.search.description,
  alternates: { canonical: "/ara" },
  // The page of results is for visitors, not for search engines' own results.
  robots: { index: false, follow: true },
};

const chip =
  "inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-ink no-underline transition-colors hover:bg-sunk";

/**
 * /ara: one box for everything with a page (articles, coffees, brands, cafés, members).
 * Static like every public page: the index comes with it, and the browser does the
 * matching. Until something is typed, the brewing guides and the quiz are offered.
 */
export default async function SearchPage() {
  const [entries, articles] = await Promise.all([getSearchIndex(), getArticles()]);
  const guides = articles.filter(isGuide);

  const shortcuts = (
    <section aria-labelledby="kisayollar" className="flex flex-col gap-3">
      <h2 id="kisayollar" className="type-label text-ink-2">
        {t.search.shortcutsTitle}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link href={`/bilgi/${guide.slug}` as Route} className={chip}>
              {guide.recipe.method}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/kahve-testi" className={chip}>
            {t.quiz.title}
          </Link>
        </li>
      </ul>
    </section>
  );

  return (
    <PageShell width="read">
      <PageHeading title={t.search.title} size="title" />
      {/* The box reads the words in the address (?q=), known only in the browser. */}
      <Suspense fallback={shortcuts}>
        <SearchBox entries={entries}>{shortcuts}</SearchBox>
      </Suspense>
    </PageShell>
  );
}
