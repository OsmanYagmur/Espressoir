"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useHasSession } from "@/lib/session-cookie";

const f = t.follow;
type Relation = "self" | "following" | "not-following";

const buttonClass = "h-10 px-5 font-mono text-xs uppercase";

/**
 * Follow or unfollow the member whose page this is. The page is static and the same for
 * everyone, so the button works out in the browser who is looking: visitors get a link to
 * the login, the member themselves get nothing, everyone else a button that writes to the
 * `follows` table directly (row level security and the rate limit do the guarding).
 * The Supabase client is loaded only for browsers that hold a session.
 */
export function FollowButton({ userId }: { userId: string }) {
  const signedIn = useHasSession();
  const [relation, setRelation] = useState<{ viewer: string; value: Relation } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    void (async () => {
      const { getBrowserSupabase } = await import("@/lib/supabase/browser");
      const supabase = getBrowserSupabase();
      const { data } = await supabase.auth.getSession();
      const viewer = data.session?.user.id;
      if (!viewer || cancelled) return;
      if (viewer === userId) return setRelation({ viewer, value: "self" });

      const { isFollowing } = await import("@espressoir/db");
      const follows = await isFollowing(supabase, viewer, userId).catch(() => false);
      if (!cancelled) setRelation({ viewer, value: follows ? "following" : "not-following" });
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn, userId]);

  if (!signedIn) {
    return (
      <Button asChild variant="outline" className={buttonClass}>
        <Link href="/giris" prefetch={false}>
          {f.follow}
        </Link>
      </Button>
    );
  }
  if (!relation || relation.value === "self") return null;

  const following = relation.value === "following";

  async function toggle() {
    if (!relation) return;
    setPending(true);
    setError(null);
    try {
      const [{ getBrowserSupabase }, { setFollowing }] = await Promise.all([
        import("@/lib/supabase/browser"),
        import("@espressoir/db"),
      ]);
      await setFollowing(getBrowserSupabase(), relation.viewer, userId, !following);
      setRelation({ ...relation, value: following ? "not-following" : "following" });
    } catch (failure) {
      const kind = (failure as { kind?: string }).kind;
      setError(
        kind === "rateLimited" ? f.rateLimited : kind === "restricted" ? f.restricted : f.failed,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid justify-items-start gap-1.5 md:justify-items-end">
      <Button
        type="button"
        variant={following ? "outline" : "default"}
        disabled={pending}
        aria-pressed={following}
        className={buttonClass}
        onClick={() => void toggle()}
      >
        {following ? f.unfollow : f.follow}
      </Button>
      {error ? (
        <p role="alert" className="font-mono text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
