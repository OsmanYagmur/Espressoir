"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV_ITEMS: ReadonlyArray<{ href: Route; label: string }> = [
  { href: "/akis", label: t.nav.feed },
  { href: "/atolye", label: t.nav.workshop },
  { href: "/bilgi", label: t.nav.info },
];

/** Where members change things. */
export const SIGNED_IN_AREA = /^\/(panel|hesap|bildirimler)(\/|$)/;

/**
 * Every change made in the signed-in area refreshes the public pages, and the router
 * answers a refresh by fetching the links on screen again. Here that would start a read
 * of the archive right after each save, and the next quick save would land in the middle
 * of it (see lib/data/refresh-archive.ts). So links wait to be clicked there.
 */
export const prefetchFrom = (pathname: string | null) =>
  pathname !== null && SIGNED_IN_AREA.test(pathname) ? false : undefined;

function NavLinkList({ pathname, className }: { pathname: string | null; className?: string }) {
  const prefetch = prefetchFrom(pathname);
  return (
    <ul className={cn("flex gap-6", className)}>
      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <li key={href}>
            <Link
              href={href}
              prefetch={prefetch}
              aria-current={active ? "page" : undefined}
              className="block border-b-2 border-transparent py-1 font-medium text-ink-2 no-underline transition-colors hover:text-ink aria-[current=page]:border-accent aria-[current=page]:text-ink"
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function CurrentNavLinks({ className }: { className?: string }) {
  return <NavLinkList pathname={usePathname()} className={className} />;
}

/**
 * The three main links, the current one underlined in the accent. Which one is current
 * depends on the URL, which a page shell prerendered for an unknown URL does not have yet;
 * the fallback shows the same links without a marker until it is known.
 */
export function NavLinks({ className }: { className?: string }) {
  return (
    <Suspense fallback={<NavLinkList pathname={null} className={className} />}>
      <CurrentNavLinks className={className} />
    </Suspense>
  );
}
