import { siteConfig } from "@espressoir/core";

import { LOGO, LOGO_VIEWBOX } from "@/lib/logo";
import { cn } from "@/lib/utils";

// Pointed at by a link around the mark (`group`), the bars fill again one after another,
// as the score bars do when a page opens.
const BAR_MOTION = ["", "animate-delay-80", "animate-delay-160"];

/** The mark alone (lib/logo.ts): the rim and handle in ink, the E on crema. */
export function LogoMark({ className }: { className?: string }) {
  const { handle, rim, crema, stem, bars } = LOGO;
  return (
    <svg viewBox={LOGO_VIEWBOX} aria-hidden className={cn("size-9 shrink-0 text-ink", className)}>
      <rect
        x={handle.x}
        y={handle.y}
        width={handle.width}
        height={handle.height}
        rx={handle.rx}
        fill="none"
        stroke="currentColor"
        strokeWidth={handle.strokeWidth}
      />
      <circle {...rim} fill="currentColor" />
      <circle {...crema} className="fill-crema" />
      <g className="fill-on-crema">
        <rect {...stem} />
        {bars.map((bar, index) => (
          <rect
            key={bar.y}
            {...bar}
            className={cn(
              "origin-left [transform-box:fill-box] motion-safe:group-hover:animate-fill",
              BAR_MOTION[index],
            )}
          />
        ))}
      </g>
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
