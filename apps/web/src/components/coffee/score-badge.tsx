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
 * score × 10 %. The colour never changes with the score. Without a score it says so in
 * words ("Puan verilmedi", for a coffee "Henüz puanlanmadı") instead of a bare dash.
 */
export function ScoreBadge({
  score,
  size = "md",
  empty = t.score.empty,
  className,
}: {
  score: number | null;
  size?: "sm" | "md";
  /** What a missing score reads as. */
  empty?: string;
  className?: string;
}) {
  if (score === null) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 text-right type-meta",
          size === "sm" ? "max-w-24" : "max-w-28",
          className,
        )}
      >
        {empty}
      </span>
    );
  }
  const text = scoreText(score);
  return (
    <span
      role="img"
      aria-label={format(t.score.aria, { score: text })}
      className={cn(
        "inline-flex shrink-0 flex-col",
        size === "sm" ? "min-w-14" : "min-w-19",
        className,
      )}
    >
      <span className="flex items-baseline gap-1">
        <span
          className={cn(
            "font-semibold tracking-tight text-ink tabular-nums",
            size === "sm" ? "text-xl" : "text-4xl/8",
          )}
        >
          {text}
        </span>
        <span className="text-sm text-ink-2 tabular-nums">/{SCORE_MAX}</span>
      </span>
      <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-sunk">
        <span
          className="block h-full origin-left rounded-full bg-accent motion-safe:animate-fill motion-safe:animate-delay-150"
          style={{ width: `${(score / SCORE_MAX) * 100}%` }}
        />
      </span>
    </span>
  );
}
