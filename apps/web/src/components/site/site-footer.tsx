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

const footerLink =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-20 w-full max-w-[1240px] px-5">
      <div className="flex flex-col gap-2 border-t-2 border-rule pt-3 pb-10 font-mono text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>
          {siteConfig.name} — {siteConfig.tagline.tr.toLocaleLowerCase("tr")}
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          <nav aria-label={t.footer.legalLabel} className="flex gap-4">
            <Link href="/kvkk" prefetch={false} className={footerLink}>
              {t.footer.kvkk}
            </Link>
            <Link href="/gizlilik" prefetch={false} className={footerLink}>
              {t.footer.privacy}
            </Link>
            <Link href="/kosullar" prefetch={false} className={footerLink}>
              {t.footer.terms}
            </Link>
          </nav>
          <CopyrightLine />
        </span>
      </div>
    </footer>
  );
}
