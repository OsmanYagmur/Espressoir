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

function NavLinkList({ pathname, className }: { pathname: string | null; className?: string }) {
  return (
    <ul className={cn("flex items-center gap-5", className)}>
      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname !== null && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <li key={href}>
            <Link
              href={href}
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
