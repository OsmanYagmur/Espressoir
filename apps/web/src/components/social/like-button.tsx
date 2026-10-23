"use client";

import { HeartIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { format, t } from "@/lib/i18n";
import { useHasSession } from "@/lib/session-cookie";
import { cn } from "@/lib/utils";

const s = t.social;
// Not a framed button (DESIGN.md): an icon and a word, a quiet background on hover.
const likeClass =
  "-ml-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md px-3 font-medium text-ink no-underline transition-colors hover:bg-sunk disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:text-accent-ink";

/**
 * Like a tasting. The count shown at first is the one the static page was built with;
 * a signed-in browser then asks for the current one and for its own like. Visitors get a
 * link to the login, the author just the count (one cannot like one's own tasting).
 */
export function LikeButton({
  tastingId,
  authorId,
  initialCount,
}: {
  tastingId: string;
  authorId: string;
  initialCount: number;
}) {
  const signedIn = useHasSession();
  const [live, setLive] = useState<{ viewer: string; liked: boolean; count: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const { getViewerId, loadLikes } = await import("./social-data");
        const viewer = await getViewerId();
        if (!viewer) return;
        const likes = await loadLikes(tastingId, viewer);
        if (!cancelled) setLive({ viewer, ...likes });
      } catch {
        // The static count stays on screen; liking is simply not offered.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, tastingId]);

  const count = live?.count ?? initialCount;
  const countText = <span className="type-meta">{format(s.likeCount, { count })}</span>;

  if (!signedIn) {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <Link href="/giris" prefetch={false} className={likeClass}>
          <HeartIcon aria-hidden className="size-5 stroke-[1.5]" />
          {s.like}
        </Link>
        {countText}
      </div>
    );
  }
  if (!live || live.viewer === authorId) {
    return <div className="flex min-h-10 items-center gap-4">{countText}</div>;
  }

  async function toggle() {
    if (!live) return;
    const next = !live.liked;
    setPending(true);
    setError(null);
    // Shown at once; taken back if the database says no.
    setLive({ ...live, liked: next, count: live.count + (next ? 1 : -1) });
    try {
      const { setLiked } = await import("./social-data");
      await setLiked(tastingId, live.viewer, next);
    } catch (failure) {
      setLive(live);
      const kind = (failure as { kind?: string }).kind;
      setError(
        kind === "rateLimited"
          ? s.errors.rateLimited
          : kind === "restricted"
            ? s.errors.restricted
            : s.errors.failed,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={pending}
          aria-pressed={live.liked}
          className={likeClass}
          onClick={() => void toggle()}
        >
          <HeartIcon
            aria-hidden
            className={cn("size-5 stroke-[1.5]", live.liked && "fill-current")}
          />
          {live.liked ? s.liked : s.like}
        </button>
        {countText}
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
