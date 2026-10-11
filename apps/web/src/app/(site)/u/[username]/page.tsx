import type { Profile } from "@espressoir/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { TastingItem } from "@/components/coffee/tasting-item";
import { FieldStrip } from "@/components/site/field-strip";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { SectionHeading } from "@/components/site/section-heading";
import { getArchive } from "@/lib/data/archive";
import { findProfile, tastingsBy } from "@/lib/data/selectors";
import { formatAverage, formatLongDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { profilePath } from "@/lib/routes";

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
            {profile.bio ? (
              // Plain text, escaped by React; line breaks the member typed are kept.
              <p className="mb-2 text-left font-sans text-sm [overflow-wrap:anywhere] whitespace-pre-line text-foreground md:text-right">
                {profile.bio}
              </p>
            ) : null}
            <p>{format(p.joined, { date: formatLongDay(profile.joinedAt.slice(0, 10)) })}</p>
          </>
        }
      />
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

      <SectionHeading index={1} title={p.tastingsTitle} aside={tastings.length} />
      {tastings.length === 0 ? (
        <p className="border-b border-border py-8 text-muted-foreground">{p.empty}</p>
      ) : (
        <ul aria-label={p.tastingsTitle}>
          {tastings.map((tasting) => (
            <TastingItem key={tasting.id} tasting={tasting} showCoffee />
          ))}
        </ul>
      )}

      {wishlist.length > 0 ? (
        <>
          <SectionHeading index={2} title={p.wishlistTitle} aside={wishlist.length} />
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
