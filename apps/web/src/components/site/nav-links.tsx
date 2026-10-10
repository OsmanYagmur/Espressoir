"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV_ITEMS: ReadonlyArray<{ href: Route; label: string }> = [
  { href: "/kahveler", label: t.nav.coffees },
  { href: "/istatistik", label: t.nav.stats },
  { href: "/hakkinda", label: t.nav.about },
];

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <ul className={cn("flex items-center gap-5", className)}>
      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
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
