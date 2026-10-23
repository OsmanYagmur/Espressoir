import type { Metadata } from "next";
import { Suspense } from "react";

import { VisitCard } from "@/components/cafe/visit-item";
import { TastingCard } from "@/components/coffee/tasting-card";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Feed } from "@/components/social/feed";
import { FEED_LIST_CLASS, FEED_PAGE_SIZE } from "@/components/social/feed-config";
import { getArchive } from "@/lib/data/archive";
import { latestVisits } from "@/lib/data/cafes";
import { getCurrentYear } from "@/lib/data/today";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.feed.title,
  description: t.feed.description,
  alternates: { canonical: "/akis" },
};

export default async function FeedPage() {
  const [archive, currentYear] = await Promise.all([getArchive(), getCurrentYear()]);
  // Newest entries first: a feed is about what was just added, not when it was tasted.
  const logged = archive.tastings
    .filter((tasting) => tasting.status === "logged")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const page = logged.slice(0, FEED_PAGE_SIZE);
  const last = page.at(-1);

  // Rendered here, on the server, and handed to the client component as is: dates are
  // formatted once, and the first page costs the browser no JavaScript.
  const first = (
    <ol aria-label={t.feed.everyone} className={FEED_LIST_CLASS}>
      {page.map((tasting) => (
        <li key={tasting.id}>
          <TastingCard tasting={tasting} currentYear={currentYear} />
        </li>
      ))}
    </ol>
  );

  // The cafés tab: the latest visits, all of them already in the archive. One page is
  // enough while cafés are new; the café list has the rest.
  const visits = latestVisits(archive, FEED_PAGE_SIZE);
  const cafes =
    visits.length === 0 ? null : (
      <ol aria-label={t.feed.cafes} className={FEED_LIST_CLASS}>
        {visits.map((visit) => (
          <li key={visit.id}>
            <VisitCard visit={visit} currentYear={currentYear} showCafe showAuthor />
          </li>
        ))}
      </ol>
    );

  return (
    <PageShell width="read">
      <PageHeading title={t.feed.title} lead={t.feed.lead} />
      {/* The open tab is in the URL, which the prerendered page does not know: until the
          browser takes over, everyone sees the public first page. */}
      <Suspense fallback={first}>
        <Feed
          first={first}
          cafes={cafes}
          cursor={last ? { createdAt: last.createdAt, id: last.id } : null}
          complete={logged.length <= FEED_PAGE_SIZE}
          currentYear={currentYear}
        />
      </Suspense>
    </PageShell>
  );
}
