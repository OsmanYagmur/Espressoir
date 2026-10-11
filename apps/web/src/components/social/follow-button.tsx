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

      const { data: rows } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", viewer)
        .eq("following_id", userId);
      if (!cancelled) {
        setRelation({ viewer, value: rows && rows.length > 0 ? "following" : "not-following" });
      }
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
      const { getBrowserSupabase } = await import("@/lib/supabase/browser");
      const follows = getBrowserSupabase().from("follows");
      const { error: failure } = following
        ? await follows.delete().eq("follower_id", relation.viewer).eq("following_id", userId)
        : await follows.insert({ follower_id: relation.viewer, following_id: userId });
      if (failure) {
        setError(
          failure.message.includes("rate_limited")
            ? f.rateLimited
            : failure.message.includes("row-level security")
              ? f.restricted
              : f.failed,
        );
      } else {
        setRelation({ ...relation, value: following ? "not-following" : "following" });
      }
    } catch {
      setError(f.failed);
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
