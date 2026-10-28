import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ScoreBadge } from "@/components/coffee/score-badge";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { ReportButton } from "@/components/social/report-button";
import { getArchive } from "@/lib/data/archive";
import { findList } from "@/lib/data/selectors";
import { formatDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { coffeePath, listPath, profilePath } from "@/lib/routes";

type Props = PageProps<"/u/[username]/liste/[slug]">;

const l = t.lists;

const link = "text-ink-2 underline underline-offset-3 hover:text-ink";

// Public lists are prerendered; one made later is rendered on its first visit. The
// placeholder keeps a site without lists buildable (it renders the 404 page).
export async function generateStaticParams() {
  const { lists } = await getArchive();
  if (lists.length === 0) return [{ username: "-", slug: "-" }];
  return lists.map((list) => ({ username: list.owner.username, slug: list.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, slug } = await params;
  const list = findList(await getArchive(), username, slug);
  if (!list) return {};

  const title = format(l.metaTitle, { title: list.title, username: list.owner.username });
  const description =
    list.description ??
    format(l.metaDescription, { username: list.owner.username, count: list.items.length });
  const canonical = listPath(list.owner.username, list.slug);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "article", title, description, url: canonical },
    // A list with nothing on it has nothing for a search engine yet.
    robots: list.items.length > 0 ? undefined : { index: false, follow: true },
  };
}

export default function ListPage({ params }: Props) {
  return (
    <PageShell width="read">
      <Suspense fallback={<PageSkeleton />}>
        <ListDetail params={params} />
      </Suspense>
    </PageShell>
  );
}

async function ListDetail({ params }: Pick<Props, "params">) {
  const { username, slug } = await params;
  const archive = await getArchive();
  const list = findList(archive, username, slug);
  if (!list) notFound();

  const coffees = new Map(archive.coffees.map((coffee) => [coffee.id, coffee]));
  // An entry whose coffee the archive does not hold (it would have to be brand new) waits
  // for the next refresh rather than showing a hole.
  const entries = list.items.flatMap((item) => {
    const coffee = coffees.get(item.coffeeId);
    return coffee ? [{ coffee, note: item.note }] : [];
  });

  return (
    <>
      <PageHeading
        title={list.title}
        kicker={
          <nav aria-label={t.coffeeDetail.breadcrumb}>
            {l.kicker}
            {" · "}
            <Link href={profilePath(list.owner.username)} className={link}>
              @{list.owner.username}
            </Link>
          </nav>
        }
        lead={
          list.description ? (
            // Plain text, escaped by React; line breaks the author typed are kept.
            <span className="[overflow-wrap:anywhere] whitespace-pre-line">{list.description}</span>
          ) : undefined
        }
      >
        <p className="type-meta">
          {format(l.itemCount, { count: entries.length })} ·{" "}
          {format(l.updated, { date: formatDay(list.updatedAt.slice(0, 10)) })}
        </p>
      </PageHeading>

      {entries.length === 0 ? (
        <p className="text-ink-2">{l.empty}</p>
      ) : (
        <ol aria-label={l.itemsLabel} className="border-t border-line">
          {entries.map(({ coffee, note }, index) => (
            <li
              key={coffee.id}
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-3 border-b border-line py-4"
            >
              <span aria-hidden className="pt-1 type-figure text-ink-2">
                {index + 1}
              </span>
              <div className="min-w-0">
                <h2 className="type-card-title [overflow-wrap:anywhere]">
                  <Link
                    href={coffeePath(coffee.brand.slug, coffee.slug)}
                    className="text-ink no-underline hover:underline"
                  >
                    {coffee.name}
                  </Link>
                </h2>
                <p className="type-meta">{coffee.brand.name}</p>
                {note ? <p className="mt-2 [overflow-wrap:anywhere]">{note}</p> : null}
              </div>
              <ScoreBadge score={coffee.stats.avgScore} size="sm" empty={t.score.emptyCoffee} />
            </li>
          ))}
        </ol>
      )}

      <ReportButton target="list" targetId={list.id} className="mt-12" />
    </>
  );
}
