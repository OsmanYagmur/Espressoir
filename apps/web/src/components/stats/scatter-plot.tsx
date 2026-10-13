import { SCORE_MAX, SCORE_MIN } from "@espressoir/core";

import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const Y_SPAN = SCORE_MAX - SCORE_MIN;
const yTicks = Array.from({ length: Y_SPAN + 1 }, (_, i) => SCORE_MIN + i);

/**
 * Brand intensity against score. Each square is a distinct (intensity, score) pair; a
 * larger square means several tastings share it. Squares are keyboard-focusable and show
 * their values on hover or focus; the same numbers are in the table underneath.
 */
export function ScatterPlot({
  points,
}: {
  points: readonly { x: number; y: number; count: number }[];
}) {
  const xs = points.map((point) => point.x);
  const xMin = Math.min(...xs) - 1;
  const xMax = Math.max(...xs) + 1;
  const xSpan = xMax - xMin;
  const xTicks = Array.from({ length: xSpan - 1 }, (_, i) => xMin + 1 + i);
  const left = (x: number) => `${((x - xMin) / xSpan) * 100}%`;
  // Half a score of headroom above 10 and below 1 keeps the squares inside the frame.
  const bottom = (y: number) => `${((y - SCORE_MIN + 0.5) / (Y_SPAN + 1)) * 100}%`;

  return (
    <figure>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 font-mono text-xs text-muted-foreground">
        <div aria-hidden className="relative h-72 w-4">
          {yTicks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2 tabular-nums"
              style={{ bottom: bottom(tick) }}
            >
              {tick}
            </span>
          ))}
        </div>
        <ul
          aria-label={t.stats.scatterTitle}
          className="relative h-72 border-b border-l border-rule"
        >
          {yTicks.map((tick) => (
            <li
              key={`grid-${tick}`}
              aria-hidden
              className="absolute inset-x-0 border-t border-border"
              style={{ bottom: bottom(tick) }}
            />
          ))}
          {points.map((point) => {
            const label = format(t.stats.tooltip.point, {
              x: point.x,
              y: point.y,
              count: point.count,
            });
            const size = Math.min(10 + (point.count - 1) * 4, 22);
            // The label opens towards the middle of the chart, so one near an edge never
            // reaches past the frame. That matters even while it is invisible: on a phone
            // it would make the whole page scroll sideways.
            const position = (point.x - xMin) / xSpan;
            const anchor =
              position < 1 / 3
                ? "left-0"
                : position > 2 / 3
                  ? "right-0"
                  : "left-1/2 -translate-x-1/2";
            return (
              <li
                key={`${point.x}:${point.y}`}
                tabIndex={0}
                className="group absolute grid size-6 -translate-x-1/2 translate-y-1/2 place-items-center outline-none hover:z-10 focus-visible:z-10"
                style={{ left: left(point.x), bottom: bottom(point.y) }}
              >
                <span
                  aria-hidden
                  className="bg-foreground ring-2 ring-background group-hover:bg-brand group-focus-visible:bg-brand"
                  style={{ width: size, height: size }}
                />
                <span
                  className={cn(
                    "pointer-events-none absolute bottom-full mb-1 w-max max-w-40 border border-rule bg-popover px-2 py-1 text-popover-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 sm:max-w-none sm:whitespace-nowrap",
                    anchor,
                  )}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
        <div />
        <div aria-hidden className="relative h-5">
          {xTicks.map((tick) => (
            <span
              key={tick}
              className="absolute top-1 -translate-x-1/2 tabular-nums"
              style={{ left: left(tick) }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
        <span>↑ {t.stats.axis.score}</span>
        <span>{t.stats.axis.intensity} →</span>
      </figcaption>
    </figure>
  );
}
