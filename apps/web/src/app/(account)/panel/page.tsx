import { cafeVisitRowSchema, tastingRowSchema } from "@espressoir/db";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { z } from "zod";

import { ScoreBadge } from "@/components/coffee/score-badge";
import { drinkLabel } from "@/components/cafe/visit-item";
import { brewLabel } from "@/components/coffee/tasting-card";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth";
import { byVisitDay, cafeHref } from "@/lib/data/cafes";
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

const link = "text-accent-ink underline underline-offset-3";

function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 py-6">
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
  // Café visits come from a newer view: a database without it simply shows none.
  const cafeRows = await supabase.from("cafe_visit_feed").select("*").eq("user_id", user.id);
  const visits = z
    .array(cafeVisitRowSchema)
    .parse(cafeRows.error ? [] : cafeRows.data)
    .sort(byVisitDay);

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

  const shortcuts: { href: Route; label: string; prefetch?: false }[] = [
    { href: profilePath(user.username), label: t.panel.profile, prefetch: false },
    { href: "/panel/listeler", label: t.lists.panel.title },
    { href: "/panel/oneriler", label: t.panel.recommendations },
    { href: "/panel/isletme", label: t.panel.business },
    { href: "/bildirimler", label: t.notifications.title, prefetch: false },
    { href: "/hesap", label: t.panel.account },
    ...(user.role === "admin" ? [{ href: "/panel/yonetim" as Route, label: t.panel.admin }] : []),
  ];

  return (
    <>
      <div className="flex flex-col gap-6">
        <p className="type-meta">{format(t.panel.signedInAs, { username: user.username })}</p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/panel/tadim/yeni">{t.panel.newTasting}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/panel/kafe/yeni">{t.panel.newCafeVisit}</Link>
          </Button>
        </div>
        <nav aria-label={t.panel.shortcuts}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {shortcuts.map(({ href, label, prefetch }) => (
              <li key={href}>
                <Link href={href} prefetch={prefetch} className={link}>
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <form action={signOut}>
                <button type="submit" className={`cursor-pointer ${link}`}>
                  {t.auth.signOut}
                </button>
              </form>
            </li>
          </ul>
        </nav>
      </div>

      {restrictedUntil ? (
        <p role="alert" className="mt-6 rounded-md bg-sunk p-4 font-medium">
          {format(t.panel.restricted, {
            date: formatLongDay(restrictedUntil.slice(0, 10)),
            reason: state?.restricted_reason
              ? format(t.panel.restrictedReason, { reason: state.restricted_reason })
              : "",
          }).trim()}
        </p>
      ) : null}

      <Section id="tadimlarim">
        <SectionHeading
          id="tadimlarim"
          title={t.panel.myTastings}
          aside={<span className="type-figure">{tastings.length}</span>}
        />
        {tastings.length === 0 ? (
          <p className="text-ink-2">{t.panel.empty}</p>
        ) : (
          <ul aria-labelledby="tadimlarim" className="border-t border-line">
            {tastings.map((tasting) => (
              <li
                key={tasting.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-line py-3"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold [overflow-wrap:anywhere]">
                    <Link
                      href={coffeePath(tasting.brand.slug, tasting.coffee.slug)}
                      className="text-ink no-underline hover:underline"
                    >
                      {tasting.coffee.name}
                    </Link>
                  </p>
                  <p className="type-meta">
                    {[
                      tasting.brand.name,
                      tasting.status === "wishlist"
                        ? t.coffee.wishlist
                        : tasting.tastedAt
                          ? formatDay(tasting.tastedAt)
                          : t.coffee.undated,
                      brewLabel(tasting),
                      tasting.visibility === "public"
                        ? null
                        : t.panel.visibility[tasting.visibility],
                      tasting.isHidden ? t.panel.hidden : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Link href={`/panel/tadim/${tasting.id}` as Route} className={link}>
                  {t.panel.edit}
                </Link>
                <ScoreBadge score={tasting.score} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="ziyaretlerim">
        <SectionHeading
          id="ziyaretlerim"
          title={t.cafes.panel.title}
          aside={<span className="type-figure">{visits.length}</span>}
        />
        {visits.length === 0 ? (
          <p className="text-ink-2">{t.cafes.panel.empty}</p>
        ) : (
          <ul aria-labelledby="ziyaretlerim" className="border-t border-line">
            {visits.map((visit) => (
              <li
                key={visit.id}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-b border-line py-3"
              >
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold [overflow-wrap:anywhere]">
                    {/* Not fetched ahead: the café's page changes with every save made here. */}
                    <Link
                      href={cafeHref(visit.cafe)}
                      prefetch={false}
                      className="text-ink no-underline hover:underline"
                    >
                      {visit.cafe.name}
                    </Link>
                  </p>
                  <p className="type-meta">
                    {[
                      formatDay(visit.visitedOn),
                      drinkLabel(visit),
                      visit.visibility === "public" ? null : t.panel.visibility[visit.visibility],
                      visit.isHidden ? t.panel.hidden : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <Link href={`/panel/kafe/${visit.id}` as Route} className={link}>
                  {t.panel.edit}
                </Link>
                <ScoreBadge score={visit.score} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

export default function PanelPage() {
  return (
    <PageShell>
      <PageHeading title={t.panel.title} size="title" />
      <Suspense fallback={<Loading />}>
        <MyTastings />
      </Suspense>
    </PageShell>
  );
}
