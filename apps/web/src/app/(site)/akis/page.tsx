import type { Metadata } from "next";
import { Suspense } from "react";

import { VisitItem } from "@/components/cafe/visit-item";
import { TastingItem } from "@/components/coffee/tasting-item";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Feed } from "@/components/social/feed";
import { FEED_PAGE_SIZE } from "@/components/social/feed-config";
import { getArchive } from "@/lib/data/archive";
import { latestVisits } from "@/lib/data/cafes";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.feed.title,
  description: t.feed.description,
  alternates: { canonical: "/akis" },
};

export default async function FeedPage() {
  const archive = await getArchive();
  // Newest entries first: a feed is about what was just added, not when it was tasted.
  const logged = archive.tastings
    .filter((tasting) => tasting.status === "logged")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const page = logged.slice(0, FEED_PAGE_SIZE);
  const last = page.at(-1);

  // Rendered here, on the server, and handed to the client component as is: dates are
  // formatted once, and the first page costs the browser no JavaScript.
  const first = (
    <ol aria-label={t.feed.everyone}>
      {page.map((tasting) => (
        <TastingItem key={tasting.id} tasting={tasting} showCoffee showAuthor clampNotes />
      ))}
    </ol>
  );

  // The cafés tab: the latest visits, all of them already in the archive. One page is
  // enough while cafés are new; the café list has the rest.
  const visits = latestVisits(archive, FEED_PAGE_SIZE);
  const cafes =
    visits.length === 0 ? null : (
      <ol aria-label={t.feed.cafes}>
        {visits.map((visit) => (
          <VisitItem key={visit.id} visit={visit} showCafe showAuthor clampNotes />
        ))}
      </ol>
    );

  return (
    <PageShell>
      <PageHeading title={t.feed.title} aside={<p>{t.feed.intro}</p>} lead={t.feed.lead} />
      {/* The open tab is in the URL, which the prerendered page does not know: until the
          browser takes over, everyone sees the public first page. */}
      <Suspense fallback={first}>
        <Feed
          first={first}
          cafes={cafes}
          cursor={last ? { createdAt: last.createdAt, id: last.id } : null}
          complete={logged.length <= FEED_PAGE_SIZE}
        />
      </Suspense>
    </PageShell>
  );
}
