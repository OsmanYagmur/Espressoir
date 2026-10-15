import { SMALL_SAMPLE, scoreHistogram, summarizeBy } from "@espressoir/core";
import type { Profile } from "@espressoir/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OfficialBadge } from "@/components/business/official-badge";
import { VisitItem } from "@/components/cafe/visit-item";
import { TastingItem } from "@/components/coffee/tasting-item";
import { FieldStrip } from "@/components/site/field-strip";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { SectionHeading } from "@/components/site/section-heading";
import { FollowButton } from "@/components/social/follow-button";
import { ReportButton } from "@/components/social/report-button";
import { GroupMeans } from "@/components/stats/group-means";
import { Radar } from "@/components/stats/radar";
import { ScoreColumns } from "@/components/stats/score-columns";
import { TagCounts } from "@/components/stats/tag-counts";
import { getArchive } from "@/lib/data/archive";
import { cafeHref, visitsBy } from "@/lib/data/cafes";
import { findProfile, listsBy, scoresOf, tastingsBy } from "@/lib/data/selectors";
import { tasteSummary } from "@/lib/data/taste-summary";
import { formatAverage, formatLongDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media";
import { brandPath, listPath, profilePath } from "@/lib/routes";

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
  let section = 0;

  return (
    <>
      <PageHeading
        plain
        fit
        title={nameOf(profile)}
        kicker={
          <>
            {p.kicker} · <span className="normal-case">@{profile.username}</span>
          </>
        }
        aside={
          <>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- already the right size
              <img
                src={avatar}
                alt={format(t.photo.avatarAlt, { username: profile.username })}
                width={96}
                height={96}
                className="mb-3 size-24 border border-border bg-muted object-cover md:ml-auto"
              />
            ) : null}
            {profile.bio ? (
              // Plain text, escaped by React; line breaks the member typed are kept.
              <p className="mb-2 text-left font-sans text-sm [overflow-wrap:anywhere] whitespace-pre-line text-foreground md:text-right">
                {profile.bio}
              </p>
            ) : null}
            <p>{format(p.joined, { date: formatLongDay(profile.joinedAt.slice(0, 10)) })}</p>
            <div className="mt-3 grid justify-items-start gap-2 md:justify-items-end">
              <FollowButton userId={profile.id} />
              <ReportButton target="profile" targetId={profile.id} />
            </div>
          </>
        }
      />
      {profile.officialFor.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-3 font-mono text-xs">
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
                className="underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
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

      {scores.length >= SMALL_SAMPLE ? (
        // The same charts as the site-wide statistics, drawn from this notebook alone.
        <div className="grid gap-x-10 md:grid-cols-2">
          <section aria-labelledby="dagilim">
            <SectionHeading
              id="dagilim"
              index={++section}
              title={p.distributionTitle}
              aside={format(p.averageNote, { n: scores.length })}
            />
            <ScoreColumns counts={scoreHistogram(scores)} className="mt-4 mb-7" />
          </section>
          <section aria-labelledby="yontemler">
            <SectionHeading id="yontemler" index={++section} title={p.methodsTitle} />
            <GroupMeans
              caption={p.methodsTitle}
              groupLabel={t.stats.columns.method}
              rows={methods}
            />
          </section>
        </div>
      ) : null}

      {taste.axes || taste.tags.length > 0 ? (
        <section aria-labelledby="damak">
          <SectionHeading
            id="damak"
            index={++section}
            title={t.taste.member.title}
            hint={t.taste.member.hint}
          />
          <div className="grid gap-x-10 gap-y-4 pt-3 pb-6 md:grid-cols-2">
            {taste.axes ? (
              <Radar
                axes={taste.axes}
                caption={format(t.taste.member.caption, { username: profile.username })}
              />
            ) : null}
            {taste.tags.length > 0 ? (
              <div>
                <p className="label-caps pb-1 text-muted-foreground">
                  {t.taste.community.tagsTitle}
                  <span className="ml-2 tracking-normal normal-case">
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
        </section>
      ) : null}

      <SectionHeading index={++section} title={p.tastingsTitle} aside={tastings.length} />
      {tastings.length === 0 ? (
        <p className="border-b border-border py-8 text-muted-foreground">{p.empty}</p>
      ) : (
        <ul aria-label={p.tastingsTitle}>
          {tastings.map((tasting) => (
            <TastingItem key={tasting.id} tasting={tasting} showCoffee />
          ))}
        </ul>
      )}

      {lists.length > 0 ? (
        <>
          <SectionHeading index={++section} title={p.listsTitle} aside={lists.length} />
          <ul aria-label={p.listsTitle}>
            {lists.map((list) => (
              <li
                key={list.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-3"
              >
                <Link
                  href={listPath(profile.username, list.slug)}
                  className="font-semiwide text-lg font-bold [overflow-wrap:anywhere] underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {list.title}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">
                  {format(t.lists.itemCount, { count: list.items.length })}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {visits.length > 0 ? (
        <>
          <SectionHeading index={++section} title={p.cafesTitle} aside={visits.length} />
          <ul aria-label={p.cafesTitle}>
            {visits.map((visit) => (
              <VisitItem key={visit.id} visit={visit} showCafe />
            ))}
          </ul>
        </>
      ) : null}

      {wishlist.length > 0 ? (
        <>
          <SectionHeading index={++section} title={p.wishlistTitle} aside={wishlist.length} />
          <ul aria-label={p.wishlistTitle}>
            {wishlist.map((tasting) => (
              <TastingItem key={tasting.id} tasting={tasting} showCoffee />
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
