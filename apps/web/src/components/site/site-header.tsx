import Link from "next/link";

import { t } from "@/lib/i18n";

import { Wordmark } from "./logo";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="border-b border-border/70">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={t.nav.home}
        >
          <Wordmark />
        </Link>
        <nav aria-label={t.nav.label} className="hidden sm:block">
          <NavLinks />
        </nav>
        <ThemeToggle />
      </div>
      {/* Small screens: links get their own row instead of hiding behind a menu button. */}
      <nav aria-label={t.nav.label} className="border-t border-border/50 sm:hidden">
        <NavLinks className="mx-auto max-w-5xl justify-center px-2 py-1" />
      </nav>
    </header>
  );
}
