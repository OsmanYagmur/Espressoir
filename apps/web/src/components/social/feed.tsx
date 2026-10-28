"use client";

import type { Tasting } from "@espressoir/db";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { TastingCard } from "@/components/coffee/tasting-card";
import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useHasSession } from "@/lib/session-cookie";
import { cn } from "@/lib/utils";

import { FEED_LIST_CLASS, FEED_PAGE_SIZE as PAGE } from "./feed-config";
import type { FeedCursor, FeedSource } from "./feed-data";

const f = t.feed;

type Tab = "everyone" | "following" | "cafes";

interface Older {
  items: Tasting[];
  done: boolean;
  failed: boolean;
  loading: boolean;
}

const cursorOf = (tasting: Tasting | undefined): FeedCursor | null =>
  tasting ? { createdAt: tasting.createdAt, id: tasting.id } : null;

/** Pages fetched in the browser, continuing after `start`. */
function useOlderPages(source: FeedSource, start: FeedCursor | null, startIsLast: boolean) {
  const [state, setState] = useState<Older>({
    items: [],
    done: false,
    failed: false,
    loading: false,
  });

  function more() {
    setState((current) => ({ ...current, loading: true, failed: false }));
    void (async () => {
      try {
        const { loadFeedPage } = await import("./feed-data");
        const page = await loadFeedPage(source, cursorOf(state.items.at(-1)) ?? start);
        setState((current) => ({
          items: [...current.items, ...page],
          done: page.length < PAGE,
          failed: false,
          loading: false,
        }));
      } catch {
        setState((current) => ({ ...current, failed: true, loading: false }));
      }
    })();
  }

  return { state: { ...state, done: state.done || startIsLast }, more };
}

/** Entries rendered in the browser. Nothing here is hydrated, so dates may be formatted. */
function OlderList({
  items,
  label,
  currentYear,
}: {
  items: Tasting[];
  label: string;
  currentYear: number;
}) {
  if (items.length === 0) return null;
  return (
    <ol aria-label={label} className={cn(FEED_LIST_CLASS, "mt-4")}>
      {items.map((tasting) => (
        <li key={tasting.id}>
          <TastingCard tasting={tasting} currentYear={currentYear} />
        </li>
      ))}
    </ol>
  );
}

/** A failed read says so and offers to try again. */
function Failed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 py-6">
      <p role="alert" className="font-medium text-danger">
        {f.failed}
      </p>
      <Button type="button" variant="secondary" onClick={onRetry}>
        {t.states.retry}
      </Button>
    </div>
  );
}

function More({ state, shown, onMore }: { state: Older; shown: boolean; onMore: () => void }) {
  if (state.failed) return <Failed onRetry={onMore} />;
  if (state.done) {
    return shown ? <p className="py-6 type-meta">{f.end}</p> : null;
  }
  return (
    <div className="py-6">
      <Button type="button" variant="secondary" disabled={state.loading} onClick={onMore}>
        {state.loading ? f.loading : f.more}
      </Button>
    </div>
  );
}

/** "Everyone": the first page arrives rendered with the static page, the rest on request. */
function EveryoneFeed({
  first,
  cursor,
  complete,
  currentYear,
}: {
  first: React.ReactNode;
  cursor: FeedCursor | null;
  complete: boolean;
  currentYear: number;
}) {
  const { state, more } = useOlderPages("tasting_feed", cursor, complete);
  if (cursor === null) {
    return <EmptyState title={f.empty} body={f.emptyHint} className="my-6" />;
  }
  return (
    <>
      {first}
      <OlderList items={state.items} label={f.everyone} currentYear={currentYear} />
      <More state={state} shown onMore={more} />
    </>
  );
}

/** "People I follow": personal, so it is read in the browser after the page has loaded. */
function FollowingFeed({ currentYear }: { currentYear: number }) {
  const signedIn = useHasSession();
  const [first, setFirst] = useState<Tasting[] | "failed" | null>(null);
  // Bumped by "Tekrar dene": reads the first page again after a failure.
  const [attempt, setAttempt] = useState(0);
  const loaded = Array.isArray(first) ? first : [];
  const { state, more } = useOlderPages(
    "following_feed",
    cursorOf(loaded.at(-1)),
    loaded.length < PAGE,
  );

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const { loadFeedPage } = await import("./feed-data");
        const items = await loadFeedPage("following_feed", null);
        if (!cancelled) setFirst(items);
      } catch {
        if (!cancelled) setFirst("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, attempt]);

  if (!signedIn) {
    return (
      <div className="flex flex-col items-start gap-4 py-8">
        <p className="text-ink-2">{f.signInFirst}</p>
        <Button asChild variant="secondary">
          <Link href="/giris" prefetch={false}>
            {f.signIn}
          </Link>
        </Button>
      </div>
    );
  }
  if (first === null) {
    return (
      <p role="status" className="py-8 text-ink-2">
        {f.loading}
      </p>
    );
  }
  if (first === "failed") {
    return (
      <Failed
        onRetry={() => {
          setFirst(null);
          setAttempt((value) => value + 1);
        }}
      />
    );
  }
  if (first.length === 0) {
    return <EmptyState title={f.followingEmpty} className="my-6" />;
  }
  return (
    <>
      <OlderList items={[...first, ...state.items]} label={f.following} currentYear={currentYear} />
      <More state={state} shown onMore={more} />
    </>
  );
}

/** "Cafés": the latest visits, rendered on the server; the café list holds the rest. */
function CafesFeed({ cafes }: { cafes: React.ReactNode }) {
  if (cafes === null) {
    return <EmptyState title={f.cafesEmpty} className="my-6" />;
  }
  return (
    <>
      {cafes}
      <p className="py-6">
        <Link href="/kafeler" className="text-accent-ink underline underline-offset-3">
          {f.cafesMore}
        </Link>
      </p>
    </>
  );
}

const TAB_PARAM: Record<string, Tab> = { takip: "following", kafeler: "cafes" };

/**
 * The feed with its three tabs. Which tab is open lives in the URL (`?sekme=takip`,
 * `?sekme=kafeler`), so a tab can be bookmarked. `first` is the public first page and
 * `cafes` the latest café visits, both rendered on the server and passed through untouched.
 */
export function Feed({
  first,
  cafes,
  cursor,
  complete,
  currentYear,
}: {
  first: React.ReactNode;
  /** Null when there are no visits yet. */
  cafes: React.ReactNode;
  /** The last entry of the first page; null when there are no entries at all. */
  cursor: FeedCursor | null;
  /** The first page already holds everything. */
  complete: boolean;
  /** For the dates of the cards read in the browser ("23 Eki"). */
  currentYear: number;
}) {
  const router = useRouter();
  const tab: Tab = TAB_PARAM[useSearchParams().get("sekme") ?? ""] ?? "everyone";

  const tabs: {
    id: Tab;
    label: string;
    href: "/akis" | "/akis?sekme=takip" | "/akis?sekme=kafeler";
  }[] = [
    { id: "everyone", label: f.everyone, href: "/akis" },
    { id: "following", label: f.following, href: "/akis?sekme=takip" },
    { id: "cafes", label: f.cafes, href: "/akis?sekme=kafeler" },
  ];

  return (
    <>
      <div role="tablist" aria-label={f.tabsLabel} className="mb-6 flex gap-6 border-b border-line">
        {tabs.map(({ id, label, href }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`sekme-${id}`}
            aria-selected={tab === id}
            aria-controls="akis-paneli"
            className="-mb-px cursor-pointer border-b-2 border-transparent py-3 font-medium text-ink-2 transition-colors hover:text-ink aria-selected:border-accent aria-selected:text-ink"
            onClick={() => router.replace(href, { scroll: false })}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="akis-paneli" aria-labelledby={`sekme-${tab}`}>
        {tab === "everyone" ? (
          <EveryoneFeed
            first={first}
            cursor={cursor}
            complete={complete}
            currentYear={currentYear}
          />
        ) : tab === "following" ? (
          <FollowingFeed currentYear={currentYear} />
        ) : (
          <CafesFeed cafes={cafes} />
        )}
      </div>
    </>
  );
}
