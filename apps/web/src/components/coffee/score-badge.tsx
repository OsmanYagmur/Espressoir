import { scoreTier, type ScoreTier } from "@espressoir/core";

import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TIER_CLASSES: Record<ScoreTier, string> = {
  low: "bg-score-low text-score-low-foreground",
  fair: "bg-score-fair text-score-fair-foreground",
  good: "bg-score-good text-score-good-foreground",
  great: "bg-score-great text-score-great-foreground",
  exceptional: "bg-score-exceptional text-score-exceptional-foreground",
};

/**
 * Colour-coded score chip. The number is always printed and announced, so colour
 * never carries the meaning on its own.
 */
export function ScoreBadge({
  score,
  size = "md",
  className,
}: {
  score: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = {
    sm: "h-6 min-w-6 px-1.5 text-xs",
    md: "h-8 min-w-8 px-2 text-sm",
    lg: "h-12 min-w-12 px-3 text-xl",
  }[size];

  if (score === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-dashed border-border font-medium text-muted-foreground",
          sizeClass,
          className,
        )}
      >
        {t.score.none}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={format(t.score.aria, { score })}
      data-tier={scoreTier(score)}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold tabular-nums",
        TIER_CLASSES[scoreTier(score)],
        sizeClass,
        className,
      )}
    >
      {score}
    </span>
  );
}
