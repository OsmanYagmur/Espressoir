import { formatMonth } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Tastings per month as thin columns. Empty months stay in place, so quiet stretches show
 * as gaps. The archive is sparse, so every non-zero column can carry its count; the year
 * is marked under each January (and under the first month).
 */
export function Timeline({ months }: { months: readonly { month: string; count: number }[] }) {
  const max = Math.max(1, ...months.map((entry) => entry.count));

  return (
    <ol
      aria-label={t.stats.timelineTitle}
      className="mb-7 flex h-40 items-end gap-0.5 border-b border-rule"
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
              startsYear && "border-l border-border",
            )}
          >
            <span className="sr-only">{label}</span>
            {count > 0 ? (
              <span aria-hidden className="mb-0.5 font-mono text-[10px] leading-none tabular-nums">
                {count}
              </span>
            ) : null}
            <span
              aria-hidden
              className="w-full bg-foreground transition-opacity group-hover:opacity-70"
              style={{ height: `${(count / max) * 82}%` }}
            />
            {startsYear ? (
              <span
                aria-hidden
                className="absolute top-full left-0 mt-1.5 pl-1 font-mono text-xs text-muted-foreground tabular-nums"
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
