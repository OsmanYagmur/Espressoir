import { SCORE_MAX } from "@espressoir/core";

import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Whole scores as they are, averages with one decimal and a Turkish comma (no Intl: the
 * badge also renders in client components, and server and browser must agree). */
function scoreText(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1).replace(".", ",");
}

/**
 * ScoreBadge (DESIGN.md): the number and one bar in the accent colour, its length the
 * score × 10 %. The colour never changes with the score. Without a score: "—".
 */
export function ScoreBadge({
  score,
  size = "md",
  className,
}: {
  score: number | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const text = score === null ? "—" : scoreText(score);
  return (
    <span
      role="img"
      aria-label={score === null ? t.score.none : format(t.score.aria, { score: text })}
      className={cn(
        "inline-flex shrink-0 flex-col",
        size === "sm" ? "min-w-14" : "min-w-19",
        className,
      )}
    >
      <span className="flex items-baseline gap-1">
        <span
          className={cn(
            "font-mono font-medium tabular-nums",
            size === "sm" ? "text-xl" : "text-4xl/8",
            score === null ? "text-ink-3" : "text-ink",
          )}
        >
          {text}
        </span>
        <span className="font-mono text-sm text-ink-2">/{SCORE_MAX}</span>
      </span>
      <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-sunk">
        {score === null ? null : (
          <span
            className="block h-full rounded-full bg-accent"
            style={{ width: `${(score / SCORE_MAX) * 100}%` }}
          />
        )}
      </span>
    </span>
  );
}
