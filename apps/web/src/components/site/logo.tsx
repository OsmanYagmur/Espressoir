import { siteConfig } from "@espressoir/core";

import { cn } from "@/lib/utils";

/** The brand mark: a solid signal-red square, like the stamp box on a tasting form. */
export function BrandMark({ className }: { className?: string }) {
  return <span aria-hidden className={cn("inline-block size-3 shrink-0 bg-brand", className)} />;
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      {/* lang="en": uppercasing "Espressoir" under lang="tr" would give "ESPRESSOİR". */}
      <span
        lang="en"
        className="font-wide text-[19px] leading-none font-extrabold tracking-tight uppercase"
      >
        {siteConfig.name}
      </span>
    </span>
  );
}
