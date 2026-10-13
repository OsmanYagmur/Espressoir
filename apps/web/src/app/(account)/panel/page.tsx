import { tastingRowSchema } from "@espressoir/db";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { ScoreBadge } from "@/components/coffee/score-badge";
import { brewLabel } from "@/components/coffee/tasting-item";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { byRecency } from "@/lib/data/selectors";
import { formatDay, formatLongDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { coffeePath, profilePath } from "@/lib/routes";

import { signOut } from "../giris/actions";

export const metadata: Metadata = {
  title: t.panel.title,
  description: t.panel.description,
  robots: { index: false, follow: false },
};

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-3 py-6">
      <span className="sr-only">{t.states.loading}</span>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

// Everything that depends on who is signed in sits behind the Suspense boundary below;
// the page frame around it is static.
async function MyTastings() {
  const { user, supabase } = await requireUser();
  const { data, error } = await supabase.from("tasting_feed").select("*").eq("user_id", user.id);
  if (error) throw new Error(error.message);
  const tastings = z.array(tastingRowSchema).parse(data).sort(byRecency);

  // A restriction is the member's to know about: until when, and why.
  const { data: state } = await supabase
    .from("profile_private")
    .select("restricted_until, restricted_reason")
    .eq("profile_id", user.id)
    .maybeSingle();
  const restrictedUntil =
    state?.restricted_until && new Date(state.restricted_until) > new Date()
      ? state.restricted_until
      : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 font-mono text-xs">
          <p className="text-muted-foreground">
            {format(t.panel.signedInAs, { username: user.username })}
          </p>
          <Link href={profilePath(user.username)} className={`uppercase ${linkFocus}`}>
            {t.panel.profile}
          </Link>
          <Link href="/panel/listeler" className={`uppercase ${linkFocus}`}>
            {t.lists.panel.title}
          </Link>
          <Link href="/bildirimler" prefetch={false} className={`uppercase ${linkFocus}`}>
            {t.notifications.title}
          </Link>
          <Link href="/hesap" className={`uppercase ${linkFocus}`}>
            {t.panel.account}
          </Link>
          {user.role === "admin" ? (
            <Link href="/panel/yonetim" className={`uppercase ${linkFocus}`}>
              {t.panel.admin}
            </Link>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Button asChild className="h-11 font-mono text-xs uppercase">
            <Link href="/panel/tadim/yeni">{t.panel.newTasting}</Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="h-11 font-mono text-xs uppercase">
              {t.auth.signOut}
            </Button>
          </form>
        </div>
      </div>

      {restrictedUntil ? (
        <p
          role="alert"
          className="mt-4 border-2 border-brand px-4 py-3 font-mono text-sm leading-relaxed"
        >
          {format(t.panel.restricted, {
            date: formatLongDay(restrictedUntil.slice(0, 10)),
            reason: state?.restricted_reason
              ? format(t.panel.restrictedReason, { reason: state.restricted_reason })
              : "",
          }).trim()}
        </p>
      ) : null}

      <SectionHeading index={1} title={t.panel.myTastings} aside={tastings.length} />
      {tastings.length === 0 ? (
        <p className="border-b border-border py-8 text-muted-foreground">{t.panel.empty}</p>
      ) : (
        <ul aria-label={t.panel.myTastings}>
          {tastings.map((tasting) => (
            <li
              key={tasting.id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-border py-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted-foreground">
                  {[
                    tasting.status === "wishlist"
                      ? t.coffee.wishlist
                      : tasting.tastedAt
                        ? formatDay(tasting.tastedAt)
                        : t.coffee.undated,
                    brewLabel(tasting),
                    tasting.visibility === "public" ? null : t.panel.visibility[tasting.visibility],
                    tasting.isHidden ? t.panel.hidden : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="font-semiwide text-lg leading-snug font-bold [overflow-wrap:anywhere]">
                  <Link
                    href={coffeePath(tasting.brand.slug, tasting.coffee.slug)}
                    className={linkFocus}
                  >
                    {tasting.coffee.name}
                  </Link>{" "}
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    {tasting.brand.name}
                  </span>
                </p>
              </div>
              <Link
                href={`/panel/tadim/${tasting.id}` as Route}
                className={`font-mono text-xs uppercase ${linkFocus}`}
              >
                {t.panel.edit}
              </Link>
              <ScoreBadge score={tasting.score} size="sm" />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function PanelPage() {
  return (
    <PageShell>
      <PageHeading title={t.panel.title} />
      <Suspense fallback={<Loading />}>
        <MyTastings />
      </Suspense>
    </PageShell>
  );
}
