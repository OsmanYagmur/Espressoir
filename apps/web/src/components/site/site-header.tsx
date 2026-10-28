import { siteConfig } from "@espressoir/core";
import Link from "next/link";

import { AccountMenu } from "@/components/account/account-menu";
import { t } from "@/lib/i18n";

import { SearchLink } from "@/components/search/search-link";

import { Wordmark } from "./logo";
import { AddTastingLink } from "./member-nav";
import { NavLinks } from "./nav-links";

/**
 * SiteHeader (DESIGN.md): the name and the main menu on the left (Keşfet, Rehberler,
 * Atölye); on the right the search button, "Tadım ekle" for members and "Giriş" or the
 * member's picture with their menu. No menu button: under 560px the menu moves to a second
 * row, and members get the tab bar at the bottom of the screen (MemberTabBar).
 */
export function SiteHeader() {
  return (
    <header className="relative z-30 border-b border-line bg-bg">
      <div className="mx-auto flex max-w-grid flex-wrap items-center gap-x-8 gap-y-1 px-4 py-3">
        {/* Not fetched ahead: the home page is built from the archive, and a fetch that
            starts while a member is saving something keeps the old state (see
            lib/data/refresh-archive.ts). It is static, so a click is fast anyway. */}
        <Link
          href="/"
          prefetch={false}
          aria-label={`${siteConfig.name} — ${t.nav.home}`}
          className="group rounded-sm no-underline max-xs:mr-auto"
        >
          <Wordmark />
        </Link>
        <nav aria-label={t.nav.label} className="max-xs:order-3 max-xs:w-full xs:mr-auto">
          <NavLinks />
        </nav>
        <div className="flex items-center gap-2">
          <SearchLink />
          <AddTastingLink />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
