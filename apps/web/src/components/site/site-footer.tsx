import { siteConfig } from "@espressoir/core";
import { cacheLife } from "next/cache";

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
        <CopyrightLine />
      </div>
    </footer>
  );
}
