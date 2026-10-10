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
    <ul className={cn("flex items-center gap-1", className)}>
      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                active &&
                  "text-foreground underline decoration-brand decoration-2 underline-offset-8",
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
