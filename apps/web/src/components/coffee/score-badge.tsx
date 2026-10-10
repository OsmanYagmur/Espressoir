import { scoreTier, type ScoreTier } from "@espressoir/core";

import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Ink-on-paper scale: low scores are faint outlines, 8 is solid ink, 9–10 get the red stamp.
const TIER_CLASSES: Record<ScoreTier, string> = {
  low: "border-input text-muted-foreground",
  fair: "border-input text-muted-foreground",
  good: "border-foreground",
  great: "border-foreground bg-foreground text-background",
  exceptional: "border-brand bg-brand text-brand-foreground",
};

const SIZE_CLASSES = {
  sm: "size-8 border-[1.5px] text-sm",
  md: "size-[54px] border-2 text-[25px]",
  lg: "size-20 border-2 text-4xl",
} as const;

/**
 * Score box. The number is always printed and announced, so colour never carries the
 * meaning on its own.
 */
export function ScoreBadge({
  score,
  size = "md",
  className,
}: {
  score: number | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  if (score === null) {
    return (
      <span
        role="img"
        aria-label={t.score.none}
        className={cn(
          "inline-grid shrink-0 place-items-center border-dashed border-input font-mono text-muted-foreground",
          SIZE_CLASSES[size],
          className,
        )}
      >
        –
      </span>
    );
  }

  const tier = scoreTier(score);
  return (
    <span
      role="img"
      aria-label={format(t.score.aria, { score })}
      data-tier={tier}
      className={cn(
        "inline-grid shrink-0 place-items-center font-extrabold tabular-nums",
        SIZE_CLASSES[size],
        TIER_CLASSES[tier],
        className,
      )}
    >
      {score}
    </span>
  );
}
