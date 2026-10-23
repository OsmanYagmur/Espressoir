import { SMALL_SAMPLE, scoreHistogram, summarizeBy } from "@espressoir/core";
import type { Profile } from "@espressoir/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OfficialBadge } from "@/components/business/official-badge";
import { VisitCard } from "@/components/cafe/visit-item";
import { TasteProfile } from "@/components/coffee/taste-profile";
import { TastingCard } from "@/components/coffee/tasting-card";
import { FieldStrip } from "@/components/site/field-strip";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { FollowButton } from "@/components/social/follow-button";
import { ReportButton } from "@/components/social/report-button";
import { GroupMeans } from "@/components/stats/group-means";
import { ScoreColumns } from "@/components/stats/score-columns";
import { TagCounts } from "@/components/stats/tag-counts";
import { cardClass } from "@/components/ui/card";
import { getArchive } from "@/lib/data/archive";
import { cafeHref, visitsBy } from "@/lib/data/cafes";
import { findProfile, listsBy, scoresOf, tastingsBy } from "@/lib/data/selectors";
import { tasteSummary } from "@/lib/data/taste-summary";
import { getCurrentYear } from "@/lib/data/today";
import { formatAverage, formatLongDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media";
import { brandPath, coffeePath, listPath, profilePath } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Props = PageProps<"/u/[username]">;

const p = t.profile;

// Every member gets a prerendered page; someone who joins later is rendered on the first
// visit. The placeholder keeps a site without members buildable (it renders the 404 page).
export async function generateStaticParams() {
  const { profiles } = await getArchive();
  if (profiles.length === 0) return [{ username: "-" }];
  return profiles.map((profile) => ({ username: profile.username }));
}

const nameOf = (profile: Profile) => profile.displayName ?? `@${profile.username}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = findProfile(await getArchive(), username);
  if (!profile) return {};

  const { tastingCount, coffeeCount } = profile.stats;
  const title = profile.displayName
    ? `${profile.displayName} (@${profile.username})`
    : `@${profile.username}`;
  const description =
    tastingCount > 0
      ? format(p.metaDescription, {
          name: nameOf(profile),
          tastings: tastingCount,
          coffees: coffeeCount,
        })
      : format(p.metaDescriptionEmpty, { name: nameOf(profile) });
  const canonical = profilePath(profile.username);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "profile", title, description, url: canonical },
    // An empty notebook has nothing for a search engine yet.
    robots: tastingCount > 0 ? undefined : { index: false, follow: true },
  };
}

export default function ProfilePage({ params }: Props) {
  return (
    <PageShell>
      <Suspense fallback={<PageSkeleton />}>
        <ProfileDetail params={params} />
      </Suspense>
    </PageShell>
  );
}

async function ProfileDetail({ params }: Pick<Props, "params">) {
  const { username } = await params;
  const archive = await getArchive();
  const profile = findProfile(archive, username);
  if (!profile) notFound();

  const all = tastingsBy(archive, profile.id);
  const tastings = all.filter((tasting) => tasting.status === "logged");
  const wishlist = all.filter((tasting) => tasting.status === "wishlist");
  const { stats } = profile;
  const scores = scoresOf(tastings);
  const methodNames = new Map(archive.brewMethods.map((method) => [method.slug, method.name]));
  const methods = summarizeBy(
    tastings,
    (tasting) => tasting.brewMethod?.slug ?? null,
    (tasting) => tasting.score,
  ).map((group) => ({ ...group, label: methodNames.get(group.key) ?? group.key }));
  const taste = tasteSummary(archive, tastings);
  const lists = listsBy(archive, profile.id);
  const visits = visitsBy(archive, profile.id);
  const avatar = profile.avatarPath ? mediaUrl(profile.avatarPath) : null;
  const currentYear = await getCurrentYear();
  const count = (n: number) => <span className="type-figure">{n}</span>;

  return (
    <>
      <PageHeading
        title={nameOf(profile)}
        kicker={profile.displayName ? `@${profile.username}` : p.kicker}
        lead={
          profile.bio ? (
            // Plain text, escaped by React; line breaks the member typed are kept.
            <span className="[overflow-wrap:anywhere] whitespace-pre-line">{profile.bio}</span>
          ) : undefined
        }
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- already the right size
          <img
            src={avatar}
            alt={format(t.photo.avatarAlt, { username: profile.username })}
            width={64}
            height={64}
            className="size-16 rounded-full bg-sunk object-cover"
          />
        ) : null}
        <p className="type-meta">
          {format(p.joined, { date: formatLongDay(profile.joinedAt.slice(0, 10)) })}
        </p>
        <FollowButton userId={profile.id} />
      </PageHeading>

      {profile.officialFor.length > 0 ? (
        <p className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2 type-meta">
          <OfficialBadge />
          {profile.officialFor.map((business, index) => (
            <span key={business.id}>
              {index > 0 ? "· " : null}
              <Link
                href={
                  business.kind === "brand"
                    ? brandPath(business.slug)
                    : cafeHref({ cityCode: business.cityCode ?? 0, slug: business.slug })
                }
                className="text-accent-ink underline underline-offset-3"
              >
                {business.name}
              </Link>
            </span>
          ))}
        </p>
      ) : null}

      <FieldStrip
        fields={[
          {
            label: p.fields.tastings,
            value: stats.tastingCount,
            note:
              stats.wishlistCount > 0
                ? format(p.wishlistNote, { count: stats.wishlistCount })
                : undefined,
            empty: stats.tastingCount === 0,
          },
          {
            label: p.fields.average,
            value: stats.avgScore === null ? "—" : formatAverage(stats.avgScore),
            note:
              stats.avgScore === null ? p.noScores : format(p.averageNote, { n: stats.ratedCount }),
            empty: stats.avgScore === null,
          },
          { label: p.fields.coffees, value: stats.coffeeCount, empty: stats.coffeeCount === 0 },
          {
            label: p.fields.followers,
            value: stats.followerCount,
            empty: stats.followerCount === 0,
          },
          {
            label: p.fields.following,
            value: stats.followingCount,
            empty: stats.followingCount === 0,
          },
        ]}
      />

      <Section id="tadimlar">
        <SectionHeading id="tadimlar" title={p.tastingsTitle} aside={count(tastings.length)} />
        {tastings.length === 0 ? (
          <p className="text-ink-2">{p.empty}</p>
        ) : (
          <ul aria-labelledby="tadimlar" className="grid gap-4 md:grid-cols-2">
            {tastings.map((tasting) => (
              <li key={tasting.id}>
                <TastingCard tasting={tasting} currentYear={currentYear} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {taste.profile || taste.tags.length > 0 ? (
        <Section id="damak">
          <SectionHeading id="damak" title={t.taste.member.title} hint={t.taste.member.hint} />
          <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
            {taste.profile ? <TasteProfile rows={taste.profile} /> : null}
            {taste.tags.length > 0 ? (
              <div>
                <p className="mb-2 type-label">
                  {t.taste.community.tagsTitle}{" "}
                  <span className="type-figure font-normal text-ink-2">
                    {format(t.taste.community.tagsAside, { n: taste.taggedCount })}
                  </span>
                </p>
                <TagCounts
                  tags={taste.tags}
                  names={taste.names}
                  caption={format(t.taste.member.tagsCaption, { username: profile.username })}
                />
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {scores.length >= SMALL_SAMPLE ? (
        // The same charts as the site-wide statistics, drawn from this notebook alone.
        <div className="grid gap-x-12 md:grid-cols-2">
          <Section id="dagilim">
            <SectionHeading
              id="dagilim"
              title={p.distributionTitle}
              aside={
                <span className="type-figure">{format(p.averageNote, { n: scores.length })}</span>
              }
            />
            <ScoreColumns counts={scoreHistogram(scores)} className="mt-4" />
          </Section>
          <Section id="yontemler">
            <SectionHeading id="yontemler" title={p.methodsTitle} />
            <GroupMeans
              caption={p.methodsTitle}
              groupLabel={t.stats.columns.method}
              rows={methods}
            />
          </Section>
        </div>
      ) : null}

      {lists.length > 0 ? (
        <Section id="listeler">
          <SectionHeading id="listeler" title={p.listsTitle} aside={count(lists.length)} />
          <ul aria-labelledby="listeler" className="grid gap-4 md:grid-cols-2">
            {lists.map((list) => (
              <li key={list.id}>
                <Link
                  href={listPath(profile.username, list.slug)}
                  className={cn(
                    cardClass,
                    "flex h-full flex-col gap-1 text-ink no-underline transition-colors hover:border-line-strong",
                  )}
                >
                  <span className="type-card-title [overflow-wrap:anywhere]">{list.title}</span>
                  <span className="type-meta">
                    {format(t.lists.itemCount, { count: list.items.length })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {visits.length > 0 ? (
        <Section id="kafeler">
          <SectionHeading id="kafeler" title={p.cafesTitle} aside={count(visits.length)} />
          <ul aria-labelledby="kafeler" className="grid gap-4 md:grid-cols-2">
            {visits.map((visit) => (
              <li key={visit.id}>
                <VisitCard visit={visit} currentYear={currentYear} showCafe />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {wishlist.length > 0 ? (
        <Section id="denenecekler">
          <SectionHeading
            id="denenecekler"
            title={p.wishlistTitle}
            aside={count(wishlist.length)}
          />
          {/* Not tastings yet: the coffees, each a link to its page. */}
          <ul aria-labelledby="denenecekler" className="border-t border-line">
            {wishlist.map((entry) => (
              <li key={entry.id} className="border-b border-line">
                <Link
                  href={coffeePath(entry.brand.slug, entry.coffee.slug)}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 py-3 text-ink no-underline hover:underline"
                >
                  <span className="font-display text-lg font-semibold">{entry.coffee.name}</span>
                  <span className="type-meta">{entry.brand.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <ReportButton target="profile" targetId={profile.id} className="mt-12" />
    </>
  );
}
