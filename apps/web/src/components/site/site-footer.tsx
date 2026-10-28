import { siteConfig } from "@espressoir/core";
import type { Route } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";

import { format, t } from "@/lib/i18n";

import { ConsentReset } from "./consent-bar";
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

type FooterLink = { href: Route; label: string };

// The archive's pages are in the header's "Keşfet" too; the footer lists every place once,
// in four groups. Archive-built pages are not fetched ahead (see lib/data/refresh-archive.ts).
const GROUPS: ReadonlyArray<{ id: string; label: string; links: readonly FooterLink[] }> = [
  {
    id: "site",
    label: t.footer.siteLabel,
    links: [
      { href: "/hakkinda", label: t.nav.about },
      { href: "/#nasil-calisir" as Route, label: t.footer.how },
      { href: "/ara", label: t.footer.search },
    ],
  },
  {
    id: "explore",
    label: t.footer.exploreLabel,
    links: [
      { href: "/kahveler", label: t.nav.coffees },
      { href: "/akis", label: t.nav.feed },
      { href: "/kafeler", label: t.nav.cafes },
      { href: "/istatistik", label: t.nav.stats },
    ],
  },
  {
    id: "learn",
    label: t.footer.learnLabel,
    links: [
      { href: "/bilgi#demleme" as Route, label: t.footer.guides },
      { href: "/bilgi", label: t.footer.articles },
      { href: "/kahve-testi", label: t.footer.quiz },
      { href: "/workshop", label: t.nav.workshop },
    ],
  },
];

const LEGAL: readonly FooterLink[] = [
  { href: "/gizlilik", label: t.footer.privacy },
  { href: "/kvkk", label: t.footer.kvkk },
  { href: "/kosullar", label: t.footer.terms },
];

const footerLink =
  "inline-block py-1 text-ink-2 no-underline transition-colors hover:text-ink hover:underline hover:underline-offset-3";
const groupTitle = "mb-2 type-label text-ink";

/**
 * The footer: the mark and the slogan with one sentence on what the site is, then every
 * place in four groups (Espressoir, Keşfet, Öğren, Yasal), then the year and the theme
 * switch. No contact line until there is a real address to give (legal-tr.ts → CONTACT).
 */
export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface md:mt-24">
      <div className="mx-auto grid max-w-grid gap-10 px-4 pt-12 pb-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-12">
        <div className="flex max-w-80 flex-col gap-3">
          <p className="flex items-center gap-3 font-display text-2xl font-semibold text-ink">
            <LogoMark />
            <span>{t.footer.slogan}</span>
          </p>
          <p className="type-meta">{t.footer.about}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
          {GROUPS.map((group) => (
            <nav key={group.id} aria-labelledby={`footer-${group.id}`}>
              <p id={`footer-${group.id}`} className={groupTitle}>
                {group.label}
              </p>
              <ul>
                {group.links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} prefetch={false} className={footerLink}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <nav aria-labelledby="footer-legal">
            <p id="footer-legal" className={groupTitle}>
              {t.footer.legalLabel}
            </p>
            <ul>
              {LEGAL.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} prefetch={false} className={footerLink}>
                    {label}
                  </Link>
                </li>
              ))}
              <li className="empty:hidden">
                <ConsentReset className={`cursor-pointer ${footerLink}`} />
              </li>
            </ul>
          </nav>
        </div>
      </div>
      <div className="mx-auto flex max-w-grid flex-col gap-4 border-t border-line px-4 py-6 type-meta sm:flex-row sm:items-center sm:justify-between">
        <CopyrightLine />
        <ThemeSwitch />
      </div>
    </footer>
  );
}
