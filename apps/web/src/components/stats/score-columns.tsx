import { SCORE_MIN } from "@espressoir/core";

import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * How many tastings got each score, as thin ink columns on a common baseline. One series,
 * so one colour and no legend. Every column carries its count on the cap, so the chart
 * reads without hovering; the list markup doubles as the table view for screen readers.
 */
export function ScoreColumns({
  counts,
  className,
}: {
  /** Index 0 = score 1 … index 9 = score 10. */
  counts: readonly number[];
  className?: string;
}) {
  const max = Math.max(1, ...counts);

  return (
    <ol
      aria-label={t.stats.distributionTitle}
      className={cn("grid h-44 grid-cols-10 items-end gap-0.5 border-b border-rule", className)}
    >
      {counts.map((count, index) => {
        const score = SCORE_MIN + index;
        return (
          <li
            key={score}
            title={format(t.stats.tooltip.scoreCount, { score, count })}
            className="group relative flex h-full flex-col items-center justify-end"
          >
            <span className="sr-only">{format(t.stats.tooltip.scoreCount, { score, count })}</span>
            <span
              aria-hidden
              className={cn(
                "mb-1 font-mono text-xs tabular-nums",
                count === 0 && "text-muted-foreground/60",
              )}
            >
              {count}
            </span>
            <span
              aria-hidden
              className="w-full max-w-6 bg-foreground transition-opacity group-hover:opacity-70"
              style={{ height: `${(count / max) * 78}%` }}
            />
            <span
              aria-hidden
              className="absolute top-full mt-1.5 font-mono text-xs text-muted-foreground tabular-nums"
            >
              {score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
