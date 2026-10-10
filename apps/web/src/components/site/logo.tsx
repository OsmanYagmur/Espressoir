import { siteConfig } from "@espressoir/core";

import { cn } from "@/lib/utils";

/** A coffee-ring stain, as left on a notebook page by a cup set down mid-tasting. */
export function RingMark({ className, thin = false }: { className?: string; thin?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("text-brand", className)} aria-hidden>
      <circle
        cx="16"
        cy="16"
        r="11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={thin ? 1.4 : 3}
        strokeLinecap="round"
        strokeDasharray="56 5 9 2.3"
        transform="rotate(-35 16 16)"
      />
      <circle
        cx="16.7"
        cy="15.3"
        r="13.2"
        fill="none"
        stroke="currentColor"
        strokeWidth={thin ? 0.5 : 0.9}
        strokeLinecap="round"
        strokeDasharray="24 7 33 4"
        opacity="0.55"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <RingMark className="size-7" />
      <span className="font-serif text-xl font-semibold tracking-tight">{siteConfig.name}</span>
    </span>
  );
}
