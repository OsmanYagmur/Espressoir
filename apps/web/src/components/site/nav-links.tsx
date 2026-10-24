"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV_ITEMS: ReadonlyArray<{ href: Route; label: string }> = [
  { href: "/bilgi", label: t.nav.info },
  { href: "/akis", label: t.nav.feed },
  { href: "/workshop", label: t.nav.workshop },
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
              className="relative block py-1 font-medium text-ink-2 no-underline transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-line-strong after:transition-transform hover:text-ink hover:after:scale-x-100 aria-[current=page]:text-ink aria-[current=page]:after:scale-x-100 aria-[current=page]:after:bg-accent"
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
 * The three main links (the articles first: the site leads with them), the current one
 * underlined in the accent. Which one is current
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
