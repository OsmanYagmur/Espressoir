import { siteConfig } from "@espressoir/core";
import type { Route } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";

import { format, t } from "@/lib/i18n";

import { LogoMark } from "./logo";
import { ThemeSwitch } from "./theme-switch";

async function CopyrightLine() {
  "use cache";
  cacheLife("days");
  return (
    <span>
      {format(t.footer.copyright, { year: new Date().getFullYear(), name: siteConfig.name })}
    </span>
  );
}

// The catalog pages live in a member's menu; everyone else finds them here.
const EXPLORE: ReadonlyArray<{ href: Route; label: string }> = [
  { href: "/kahveler", label: t.nav.coffees },
  { href: "/kafeler", label: t.nav.cafes },
  { href: "/istatistik", label: t.nav.stats },
  { href: "/hakkinda", label: t.nav.about },
];

const LEGAL: ReadonlyArray<{ href: Route; label: string }> = [
  { href: "/kvkk", label: t.footer.kvkk },
  { href: "/gizlilik", label: t.footer.privacy },
  { href: "/kosullar", label: t.footer.terms },
];

const footerLink = "text-ink-2 no-underline transition-colors hover:text-ink";

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-line md:mt-16">
      <div className="mx-auto flex max-w-grid flex-col gap-6 px-4 py-8">
        <p className="flex items-center gap-3 font-display text-2xl font-semibold text-ink">
          <LogoMark />
          {t.footer.slogan}
        </p>
        <nav aria-label={t.footer.exploreLabel}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {EXPLORE.map(({ href, label }) => (
              <li key={href}>
                {/* Not fetched ahead: built from the archive (see lib/data/refresh-archive.ts). */}
                <Link href={href} prefetch={false} className={footerLink}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-4 border-t border-line pt-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 type-meta">
            <nav aria-label={t.footer.legalLabel}>
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {LEGAL.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} prefetch={false} className={footerLink}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <CopyrightLine />
          </div>
          <ThemeSwitch />
        </div>
      </div>
    </footer>
  );
}
