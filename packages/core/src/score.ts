export const SCORE_MIN = 1;
export const SCORE_MAX = 10;

/** Colour bands for score badges, from pale ash (low) to coffee-cherry red (exceptional). */
export const SCORE_TIERS = ["low", "fair", "good", "great", "exceptional"] as const;
export type ScoreTier = (typeof SCORE_TIERS)[number];

export function isValidScore(value: unknown): value is number {
  return (
    Number.isInteger(value) && (value as number) >= SCORE_MIN && (value as number) <= SCORE_MAX
  );
}

export function scoreTier(score: number): ScoreTier {
  if (score <= 3) return "low";
  if (score <= 5) return "fair";
  if (score <= 7) return "good";
  if (score <= 8) return "great";
  return "exceptional";
}
