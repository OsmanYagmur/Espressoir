import { formatMonth } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Tastings per month as thin columns. Empty months stay in place, so quiet stretches show
 * as gaps. The year is marked under each January (and under the first month); each
 * month's count is in its label and in the table under the chart.
 */
export function Timeline({ months }: { months: readonly { month: string; count: number }[] }) {
  const max = Math.max(1, ...months.map((entry) => entry.count));

  return (
    <ol
      aria-label={t.stats.timelineTitle}
      className="mb-8 flex h-40 items-end gap-1 border-b border-line-strong"
    >
      {months.map(({ month, count }, index) => {
        const label = format(t.stats.tooltip.month, { month: formatMonth(month), count });
        const startsYear = month.endsWith("-01") || index === 0;
        return (
          <li
            key={month}
            title={label}
            className={cn(
              "group relative flex h-full max-w-6 flex-1 flex-col items-center justify-end",
              startsYear && "border-l border-line",
            )}
          >
            <span className="sr-only">{label}</span>
            <span
              aria-hidden
              className="w-full rounded-t-sm bg-ink-2 transition-opacity group-hover:opacity-70"
              style={{ height: `${(count / max) * 82}%` }}
            />
            {startsYear ? (
              <span
                aria-hidden
                className="absolute top-full left-0 mt-2 pl-1 type-figure text-ink-2"
              >
                {month.slice(0, 4)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
