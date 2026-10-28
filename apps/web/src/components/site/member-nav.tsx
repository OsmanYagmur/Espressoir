"use client";

import { BookOpenIcon, CompassIcon, NewspaperIcon, PlusIcon, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useHasSession } from "@/lib/session-cookie";
import { cn } from "@/lib/utils";

import { prefetchFrom } from "./nav-links";

const NEW_TASTING: Route = "/panel/tadim/yeni";

/**
 * "Tadım ekle" in the header, for members on a wide screen: the notebook's main action one
 * click away from every page. Visitors never see it (the browser decides from the session
 * cookie, like the account menu); on a phone the tab bar carries it instead.
 */
export function AddTastingLink() {
  const signedIn = useHasSession();
  if (!signedIn) return null;
  return (
    <Button asChild variant="secondary" size="sm" className="max-md:hidden">
      <Link href={NEW_TASTING} prefetch={false}>
        <PlusIcon aria-hidden />
        {t.nav.addTasting}
      </Link>
    </Button>
  );
}

const TABS: ReadonlyArray<{
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Also current on these pages. */
  area?: RegExp;
}> = [
  { href: "/akis", label: t.nav.tabs.feed, icon: NewspaperIcon, area: /^\/(akis|tadim)(\/|$)/ },
  {
    href: "/kahveler",
    label: t.nav.tabs.explore,
    icon: CompassIcon,
    area: /^\/(kahveler|kahve|marka|kafeler|kafe|istatistik)(\/|$)/,
  },
  { href: NEW_TASTING, label: t.nav.tabs.add, icon: PlusIcon },
  { href: "/panel", label: t.nav.tabs.notebook, icon: BookOpenIcon, area: /^\/panel(\/|$)/ },
];

/**
 * Pages that keep a bar of their own at the bottom (the forms' save bar, the workshop's
 * "Başvur") or that are not part of a member's day (sign-in, the admin area): no tab bar.
 */
const OWN_BOTTOM =
  /^\/(panel\/tadim|panel\/kafe|workshop|giris|hesap\/kurulum|osman|teyit|uygulama)(\/|$)/;

function TabBar({ pathname }: { pathname: string }) {
  const prefetch = prefetchFrom(pathname);
  const current = (tab: (typeof TABS)[number]) =>
    pathname === tab.href || (tab.area?.test(pathname) ?? false);
  // The add tab is never "current": the form has no tab bar.
  return (
    <>
      {/* Keeps the end of the page (the footer) clear of the bar. */}
      <div aria-hidden className="h-16 md:hidden" />
      <nav
        aria-label={t.nav.tabBar}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-sticky md:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-read grid-cols-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const add = tab.href === NEW_TASTING;
            const active = !add && current(tab);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  prefetch={add ? false : prefetch}
                  aria-current={active ? "page" : undefined}
                  className="group relative flex h-full flex-col items-center justify-center gap-1 text-sm font-semibold text-ink-2 no-underline aria-[current=page]:text-ink"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid place-items-center rounded-full transition-colors",
                      add
                        ? "size-9 bg-primary text-on-primary"
                        : "size-7 group-aria-[current=page]:text-accent",
                    )}
                  >
                    <Icon className="size-5 stroke-[1.5]" />
                  </span>
                  {tab.label}
                  {active ? (
                    <span
                      aria-hidden
                      className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function CurrentTabBar() {
  const pathname = usePathname();
  const signedIn = useHasSession();
  if (!signedIn || OWN_BOTTOM.test(pathname)) return null;
  return <TabBar pathname={pathname} />;
}

/**
 * MemberTabBar: on a phone, a member's four daily places at the bottom of the screen
 * (Akış, Keşfet, Ekle, Defterim), within the thumb's reach. Visitors browse with the header
 * menu and never see it. It reads the URL, so it waits behind Suspense in a static shell.
 */
export function MemberTabBar() {
  return (
    <Suspense fallback={null}>
      <CurrentTabBar />
    </Suspense>
  );
}
