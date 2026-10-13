"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV_ITEMS: ReadonlyArray<{ href: Route; label: string }> = [
  { href: "/kahveler", label: t.nav.coffees },
  { href: "/akis", label: t.nav.feed },
  { href: "/istatistik", label: t.nav.stats },
  { href: "/hakkinda", label: t.nav.about },
];

/** Where members change things. */
const SIGNED_IN_AREA = /^\/(panel|hesap|bildirimler)(\/|$)/;

function NavLinkList({ pathname, className }: { pathname: string | null; className?: string }) {
  // Every change made in the signed-in area refreshes the public pages, and the router
  // answers a refresh by fetching the links on screen again. Here that would start a read
  // of the archive right after each save, and the next quick save would land in the middle
  // of it (see lib/data/refresh-archive.ts). So these links wait to be clicked there.
  const prefetch = pathname !== null && SIGNED_IN_AREA.test(pathname) ? false : undefined;
  return (
    <ul className={cn("flex items-center gap-5", className)}>
      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <li key={href}>
            <Link
              href={href}
              prefetch={prefetch}
              aria-current={active ? "page" : undefined}
              className={cn(
                "font-mono text-xs font-medium tracking-wide uppercase underline-offset-[6px] hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                active && "underline decoration-brand decoration-2",
              )}
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
 * The main links, with the current section underlined. Which section is current depends
 * on the URL, which a page shell prerendered for an unknown URL does not have yet; the
 * fallback shows the same links without a marker until it is known.
 */
export function NavLinks({ className }: { className?: string }) {
  return (
    <Suspense fallback={<NavLinkList pathname={null} className={className} />}>
      <CurrentNavLinks className={className} />
    </Suspense>
  );
}
