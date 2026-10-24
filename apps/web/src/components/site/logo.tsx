import { siteConfig } from "@espressoir/core";

import { LOGO_BARS, LOGO_VIEWBOX } from "@/lib/logo";
import { cn } from "@/lib/utils";

// Pointed at by a link around the mark (`group`), the rows fill again from the top, one
// after another, as the score bars do when a page opens.
const ROW_MOTION = [
  "",
  "motion-safe:group-hover:animate-delay-40",
  "motion-safe:group-hover:animate-delay-80",
  "motion-safe:group-hover:animate-delay-120",
  "motion-safe:group-hover:animate-delay-160",
  "motion-safe:group-hover:animate-delay-200",
  "motion-safe:group-hover:animate-delay-240",
  "motion-safe:group-hover:animate-delay-280",
];

/** The mark alone (lib/logo.ts): a bean of score bars, in the accent. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      aria-hidden
      className={cn("h-9 w-7.5 shrink-0 fill-accent", className)}
    >
      {LOGO_BARS.map(({ row, ...bar }) => (
        <rect
          key={`${row}-${bar.x}`}
          {...bar}
          rx={bar.height / 2}
          className={cn(
            "origin-left [transform-box:fill-box] motion-safe:group-hover:animate-fill",
            ROW_MOTION[row],
          )}
        />
      ))}
    </svg>
  );
}

/** The mark and the name in the display face, as written. */
export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span lang="en" className="font-display text-2xl font-semibold text-ink">
        {siteConfig.name}
      </span>
    </span>
  );
}
