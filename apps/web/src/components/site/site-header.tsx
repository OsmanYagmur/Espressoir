import { siteConfig } from "@espressoir/core";
import Link from "next/link";

import { t } from "@/lib/i18n";

import { Wordmark } from "./logo";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="mx-auto w-full max-w-[1240px] px-5">
      <div className="flex flex-wrap items-center justify-between gap-y-1 border-b-2 border-rule py-2.5">
        <Link
          href="/"
          aria-label={`${siteConfig.name} — ${t.nav.home}`}
          className="py-1 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Wordmark />
        </Link>
        <div className="flex items-center gap-5">
          <nav aria-label={t.nav.label} className="max-sm:hidden">
            <NavLinks />
          </nav>
          <ThemeToggle />
        </div>
        {/* Small screens: links get their own row under a hairline instead of a menu button. */}
        <nav aria-label={t.nav.label} className="w-full border-t py-2 sm:hidden">
          <NavLinks />
        </nav>
      </div>
    </header>
  );
}
