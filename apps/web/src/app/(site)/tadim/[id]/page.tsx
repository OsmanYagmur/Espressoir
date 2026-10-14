import type { Tasting } from "@espressoir/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TastingItem } from "@/components/coffee/tasting-item";
import { TastingPhoto } from "@/components/coffee/tasting-photo";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { Radar } from "@/components/stats/radar";
import { SectionHeading } from "@/components/site/section-heading";
import { CommentThread } from "@/components/social/comment-thread";
import { LikeButton } from "@/components/social/like-button";
import { ReportButton } from "@/components/social/report-button";
import { getArchive } from "@/lib/data/archive";
import { findTasting } from "@/lib/data/selectors";
import { format, t } from "@/lib/i18n";
import { brandPath, coffeePath, profilePath, tastingPath } from "@/lib/routes";
import { profileAxes } from "@/lib/taste-axes";

type Props = PageProps<"/tadim/[id]">;

const p = t.tastingPage;
const PRERENDERED = 50;

const linkFocus =
  "inline-block py-1.5 underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

// The most recent tastings are prerendered; older ones are rendered on their first visit.
// The placeholder keeps an empty archive buildable (it renders the 404 page).
export async function generateStaticParams() {
  const { tastings } = await getArchive();
  const recent = tastings
    .filter((tasting) => tasting.status === "logged")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, PRERENDERED);
  if (recent.length === 0) return [{ id: "-" }];
  return recent.map((tasting) => ({ id: tasting.id }));
}

const authorName = (tasting: Tasting) =>
  tasting.author.displayName ?? `@${tasting.author.username}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tasting = findTasting(await getArchive(), id);
  if (!tasting) return {};

  const values = {
    author: authorName(tasting),
    brand: tasting.brand.name,
    coffee: tasting.coffee.name,
  };
  return {
    title: format(p.metaTitle, values),
    description: tasting.notes?.slice(0, 160) ?? format(p.metaDescription, values),
    alternates: { canonical: tastingPath(tasting.id) },
    // One person's note is thin on its own: search engines get the coffee's page instead.
    robots: { index: false, follow: true },
  };
}

export default function TastingPage({ params }: Props) {
  return (
    <PageShell>
      <Suspense fallback={<PageSkeleton />}>
        <TastingDetail params={params} />
      </Suspense>
    </PageShell>
  );
}

async function TastingDetail({ params }: Pick<Props, "params">) {
  const { id } = await params;
  const tasting = findTasting(await getArchive(), id);
  if (!tasting) notFound();

  const axes = profileAxes(tasting.profile);
  const hasProfile = axes.some((axis) => axis.value !== null);

  return (
    <>
      <PageHeading
        plain
        title={tasting.coffee.name}
        kicker={
          <nav aria-label={t.coffeeDetail.breadcrumb}>
            {p.kicker}
            {" / "}
            <Link
              href={profilePath(tasting.author.username)}
              className={`normal-case ${linkFocus}`}
            >
              @{tasting.author.username}
            </Link>
            {" / "}
            {/* Brand names keep their own spelling: no CSS uppercasing. */}
            <Link href={brandPath(tasting.brand.slug)} className={`normal-case ${linkFocus}`}>
              {tasting.brand.name}
            </Link>
          </nav>
        }
        aside={
          <Link
            href={coffeePath(tasting.brand.slug, tasting.coffee.slug)}
            className={`uppercase ${linkFocus}`}
          >
            {p.backToCoffee} →
          </Link>
        }
      />

      <ol aria-label={p.kicker}>
        <TastingItem tasting={tasting} showAuthor standalone />
      </ol>

      {tasting.photo ? (
        <figure className="border-b border-border py-4">
          <TastingPhoto tasting={tasting} className="max-h-[80vh] w-auto" />
          {tasting.photo.alt ? (
            <figcaption className="mt-2 max-w-[62ch] font-mono text-xs text-muted-foreground">
              {tasting.photo.alt}
            </figcaption>
          ) : null}
        </figure>
      ) : null}

      {hasProfile || tasting.wouldBuyAgain !== null ? (
        <section
          aria-label={t.taste.profileTitle}
          className="grid gap-4 border-b border-border py-4"
        >
          {hasProfile ? (
            <Radar
              axes={axes}
              caption={format(p.profileCaption, { coffee: tasting.coffee.name })}
            />
          ) : null}
          {tasting.wouldBuyAgain !== null ? (
            <dl className="flex gap-2 font-mono text-xs">
              <dt className="text-muted-foreground">{p.buyAgain}</dt>
              <dd>{tasting.wouldBuyAgain ? p.yes : p.no}</dd>
            </dl>
          ) : null}
        </section>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule py-4">
        <LikeButton
          tastingId={tasting.id}
          authorId={tasting.author.id}
          initialCount={tasting.likeCount}
        />
        <ReportButton target="tasting" targetId={tasting.id} />
      </div>

      <section aria-labelledby="yorumlar">
        <SectionHeading id="yorumlar" index={1} title={t.social.commentsTitle} />
        <CommentThread tastingId={tasting.id} />
      </section>
    </>
  );
}
