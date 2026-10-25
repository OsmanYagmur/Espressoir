import { siteConfig } from "@espressoir/core";
import Link from "next/link";

import { AccountMenu } from "@/components/account/account-menu";
import { t } from "@/lib/i18n";

import { SearchLink } from "@/components/search/search-link";

import { Wordmark } from "./logo";
import { NavLinks } from "./nav-links";

/**
 * SiteHeader (DESIGN.md): the name, three links, and on the right the search button and
 * "Giriş" or the member's picture with their menu. No menu button: under 560px the links
 * move to a second row.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-line bg-bg">
      <div className="mx-auto flex max-w-grid flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        {/* Not fetched ahead: the home page is built from the archive, and a fetch that
            starts while a member is saving something keeps the old state (see
            lib/data/refresh-archive.ts). It is static, so a click is fast anyway. */}
        <Link
          href="/"
          prefetch={false}
          aria-label={`${siteConfig.name} — ${t.nav.home}`}
          className="group mr-auto rounded-sm no-underline"
        >
          <Wordmark />
        </Link>
        <nav aria-label={t.nav.label} className="max-xs:order-3 max-xs:w-full">
          <NavLinks />
        </nav>
        <div className="flex items-center gap-2">
          <SearchLink />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
