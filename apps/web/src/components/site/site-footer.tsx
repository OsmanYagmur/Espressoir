import { siteConfig } from "@espressoir/core";
import { cacheLife } from "next/cache";

import { format, t } from "@/lib/i18n";

import { RingMark } from "./logo";

async function CopyrightLine() {
  "use cache";
  cacheLife("days");
  return (
    <p>{format(t.footer.copyright, { year: new Date().getFullYear(), name: siteConfig.name })}</p>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <RingMark className="size-5" />
          <span className="font-serif italic">{siteConfig.tagline.tr}</span>
        </p>
        <div className="flex flex-col gap-1 sm:items-end">
          <p>{t.footer.note}</p>
          <CopyrightLine />
        </div>
      </div>
    </footer>
  );
}
