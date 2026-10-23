import { SCORE_MIN } from "@espressoir/core";

import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * How many tastings got each score, as columns on a common baseline. One series, so one
 * colour and no legend. Every column carries its count on the cap, so the chart reads
 * without hovering; the list markup doubles as the table view for screen readers.
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
      className={cn(
        "mb-8 grid h-44 grid-cols-10 items-end gap-1 border-b border-line-strong",
        className,
      )}
    >
      {counts.map((count, index) => {
        const score = SCORE_MIN + index;
        return (
          <li
            key={score}
            title={format(t.stats.tooltip.scoreCount, { score, count })}
            className="relative flex h-full flex-col items-center justify-end"
          >
            <span className="sr-only">{format(t.stats.tooltip.scoreCount, { score, count })}</span>
            <span aria-hidden className={cn("mb-1 type-figure", count === 0 && "text-ink-3")}>
              {count}
            </span>
            <span
              aria-hidden
              className="w-full max-w-6 rounded-t-sm bg-ink-2"
              style={{ height: `${(count / max) * 78}%` }}
            />
            <span aria-hidden className="absolute top-full mt-2 type-figure text-ink-2">
              {score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
