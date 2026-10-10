import { siteConfig } from "@espressoir/core";
import { cacheLife } from "next/cache";
import Link from "next/link";

import { format, t } from "@/lib/i18n";

async function CopyrightLine() {
  "use cache";
  cacheLife("days");
  return (
    <span>
      {format(t.footer.copyright, { year: new Date().getFullYear(), name: siteConfig.name })}
    </span>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-20 w-full max-w-[1240px] px-5">
      <div className="flex flex-col gap-1 border-t-2 border-rule pt-3 pb-10 font-mono text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>
          {siteConfig.name} — {siteConfig.tagline.tr.toLocaleLowerCase("tr")}
        </span>
        <span className="flex gap-4">
          {/* The way in for people with an account; visitors are sent to the login page. */}
          <Link
            href="/panel"
            prefetch={false}
            className="underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {t.nav.panel}
          </Link>
          <CopyrightLine />
        </span>
      </div>
    </footer>
  );
}
