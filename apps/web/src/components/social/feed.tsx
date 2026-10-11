"use client";

import type { Tasting } from "@espressoir/db";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { TastingItem } from "@/components/coffee/tasting-item";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useHasSession } from "@/lib/session-cookie";
import { cn } from "@/lib/utils";

import { FEED_PAGE_SIZE as PAGE } from "./feed-config";
import type { FeedCursor, FeedSource } from "./feed-data";

const f = t.feed;

type Tab = "everyone" | "following";

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
function OlderList({ items, label }: { items: Tasting[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <ol aria-label={label}>
      {items.map((tasting) => (
        <TastingItem key={tasting.id} tasting={tasting} showCoffee showAuthor clampNotes />
      ))}
    </ol>
  );
}

function More({ state, shown, onMore }: { state: Older; shown: boolean; onMore: () => void }) {
  if (state.failed) {
    return (
      <p role="alert" className="py-5 font-mono text-sm text-destructive">
        {f.failed}
      </p>
    );
  }
  if (state.done) {
    return shown ? <p className="py-5 font-mono text-xs text-muted-foreground">{f.end}</p> : null;
  }
  return (
    <div className="py-5">
      <Button
        type="button"
        variant="outline"
        disabled={state.loading}
        className="h-11 px-6 font-mono text-xs uppercase"
        onClick={onMore}
      >
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
}: {
  first: React.ReactNode;
  cursor: FeedCursor | null;
  complete: boolean;
}) {
  const { state, more } = useOlderPages("tasting_feed", cursor, complete);
  if (cursor === null) {
    return <p className="border-b border-border py-8 text-muted-foreground">{f.empty}</p>;
  }
  return (
    <>
      {first}
      <OlderList items={state.items} label={f.everyone} />
      <More state={state} shown onMore={more} />
    </>
  );
}

/** "People I follow": personal, so it is read in the browser after the page has loaded. */
function FollowingFeed() {
  const signedIn = useHasSession();
  const [first, setFirst] = useState<Tasting[] | "failed" | null>(null);
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
  }, [signedIn]);

  if (!signedIn) {
    return (
      <div className="grid justify-items-start gap-4 border-b border-border py-8">
        <p className="text-muted-foreground">{f.signInFirst}</p>
        <Button asChild className="h-11 px-6 font-mono text-xs uppercase">
          <Link href="/giris" prefetch={false}>
            {f.signIn}
          </Link>
        </Button>
      </div>
    );
  }
  if (first === null) {
    return (
      <p role="status" className="py-8 font-mono text-sm text-muted-foreground">
        {f.loading}
      </p>
    );
  }
  if (first === "failed") {
    return (
      <p role="alert" className="py-8 font-mono text-sm text-destructive">
        {f.failed}
      </p>
    );
  }
  if (first.length === 0) {
    return <p className="border-b border-border py-8 text-muted-foreground">{f.followingEmpty}</p>;
  }
  return (
    <>
      <OlderList items={[...first, ...state.items]} label={f.following} />
      <More state={state} shown onMore={more} />
    </>
  );
}

/**
 * The feed with its two tabs. Which tab is open lives in the URL (`?sekme=takip`), so a
 * link to "people I follow" can be bookmarked. `first` is the public first page, rendered
 * on the server and passed through untouched.
 */
export function Feed({
  first,
  cursor,
  complete,
}: {
  first: React.ReactNode;
  /** The last entry of the first page; null when there are no entries at all. */
  cursor: FeedCursor | null;
  /** The first page already holds everything. */
  complete: boolean;
}) {
  const router = useRouter();
  const tab: Tab = useSearchParams().get("sekme") === "takip" ? "following" : "everyone";

  const tabs: { id: Tab; label: string; href: "/akis" | "/akis?sekme=takip" }[] = [
    { id: "everyone", label: f.everyone, href: "/akis" },
    { id: "following", label: f.following, href: "/akis?sekme=takip" },
  ];

  return (
    <>
      <div role="tablist" aria-label={f.tabsLabel} className="flex border-b border-rule">
        {tabs.map(({ id, label, href }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`sekme-${id}`}
            aria-selected={tab === id}
            aria-controls="akis-paneli"
            className={cn(
              "-mb-px border-b-2 px-4 py-3 font-mono text-xs font-medium tracking-wide uppercase focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              tab === id
                ? "border-brand"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
            onClick={() => router.replace(href, { scroll: false })}
          >
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="akis-paneli" aria-labelledby={`sekme-${tab}`}>
        {tab === "everyone" ? (
          <EveryoneFeed first={first} cursor={cursor} complete={complete} />
        ) : (
          <FollowingFeed />
        )}
      </div>
    </>
  );
}
