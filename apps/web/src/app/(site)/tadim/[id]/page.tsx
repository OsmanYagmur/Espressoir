import type { Tasting } from "@espressoir/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { FlavorTags } from "@/components/coffee/flavor-tags";
import { ScoreBadge } from "@/components/coffee/score-badge";
import { TasteProfile } from "@/components/coffee/taste-profile";
import { brewLabel } from "@/components/coffee/tasting-card";
import { TastingPhoto } from "@/components/coffee/tasting-photo";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { CommentThread } from "@/components/social/comment-thread";
import { LikeButton } from "@/components/social/like-button";
import { ReportButton } from "@/components/social/report-button";
import { getArchive } from "@/lib/data/archive";
import { findTasting } from "@/lib/data/selectors";
import { format, t } from "@/lib/i18n";
import { brandPath, coffeePath, profilePath, tastingPath } from "@/lib/routes";
import { formatDay } from "@/lib/format";
import { profileRows } from "@/lib/taste-axes";

type Props = PageProps<"/tadim/[id]">;

const p = t.tastingPage;
const PRERENDERED = 50;

const link = "text-ink-2 underline underline-offset-3 hover:text-ink";

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
    <PageShell width="read">
      <Suspense fallback={<PageSkeleton />}>
        <TastingDetail params={params} />
      </Suspense>
    </PageShell>
  );
}

async function TastingDetail({ params }: Pick<Props, "params">) {
  const { id } = await params;
  const archive = await getArchive();
  const tasting = findTasting(archive, id);
  if (!tasting) notFound();

  const profile = profileRows(tasting.profile);
  const brew = brewLabel(tasting);

  return (
    <>
      <PageHeading
        title={tasting.coffee.name}
        kicker={
          <nav aria-label={t.coffeeDetail.breadcrumb}>
            <Link href={profilePath(tasting.author.username)} className={link}>
              @{tasting.author.username}
            </Link>
            {tasting.tastedAt ? (
              <>
                {" · "}
                <time dateTime={tasting.tastedAt}>{formatDay(tasting.tastedAt)}</time>
              </>
            ) : null}
          </nav>
        }
      >
        <div className="flex w-full flex-wrap items-end justify-between gap-4">
          <p className="type-meta">
            <Link href={brandPath(tasting.brand.slug)} className={link}>
              {tasting.brand.name}
            </Link>
            {brew ? ` · ${brew}` : null}
            {" · "}
            <Link href={coffeePath(tasting.brand.slug, tasting.coffee.slug)} className={link}>
              {p.backToCoffee}
            </Link>
          </p>
          <ScoreBadge score={tasting.score} />
        </div>
      </PageHeading>

      {tasting.photo ? (
        <figure className="mb-8">
          <TastingPhoto tasting={tasting} className="max-h-[80vh] w-auto rounded-lg" />
          {tasting.photo.alt ? (
            <figcaption className="mt-2 type-meta">{tasting.photo.alt}</figcaption>
          ) : null}
        </figure>
      ) : null}

      <div className="flex flex-col gap-6">
        <TasteProfile rows={profile} />
        <FlavorTags tags={tasting.tags} />
        {tasting.notes ? (
          // Plain text, escaped by React; line breaks the author typed are kept.
          <p className="text-lg [overflow-wrap:anywhere] whitespace-pre-line">{tasting.notes}</p>
        ) : null}
        {tasting.wouldBuyAgain !== null ? (
          <dl className="flex gap-2 type-meta">
            <dt>{p.buyAgain}</dt>
            <dd className="font-medium text-ink">{tasting.wouldBuyAgain ? p.yes : p.no}</dd>
          </dl>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-line py-3">
        <LikeButton
          tastingId={tasting.id}
          authorId={tasting.author.id}
          initialCount={tasting.likeCount}
        />
        <ReportButton target="tasting" targetId={tasting.id} />
      </div>

      <Section id="yorumlar">
        <SectionHeading id="yorumlar" title={t.social.commentsTitle} />
        <CommentThread
          tastingId={tasting.id}
          officialIds={archive.profiles
            .filter((member) =>
              member.officialFor.some(
                (business) => business.kind === "brand" && business.id === tasting.brand.id,
              ),
            )
            .map((member) => member.id)}
        />
      </Section>
    </>
  );
}
