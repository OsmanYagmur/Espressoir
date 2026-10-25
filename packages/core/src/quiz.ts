/**
 * The coffee quiz's arithmetic (/kahve-testi): every answer gives points to some choices
 * (a brewing method, a roast), the one with the most wins, ties going to the earlier one
 * in a fixed order. The answers travel in the address as one digit each ("02110"), so a
 * result can be shared and opened again. The questions and their weights are the
 * website's content (src/content/kahve-testi.ts).
 */

export type Weights<K extends string> = Partial<Record<K, number>>;

/** The choice with the most points over every picked answer; ties go to the earlier in `order`. */
export function tally<K extends string>(order: readonly K[], picks: readonly Weights<K>[]): K {
  const points = (key: K) => picks.reduce((sum, weights) => sum + (weights[key] ?? 0), 0);
  let best = order[0]!;
  let bestPoints = points(best);
  for (const key of order.slice(1)) {
    const value = points(key);
    if (value > bestPoints) {
      best = key;
      bestPoints = value;
    }
  }
  return best;
}

/** Answers (each an option's index, below 10) as the address carries them. */
export function encodeAnswers(answers: readonly number[]): string {
  return answers.join("");
}

/**
 * The answers back from the address, or null when they do not fit the questions: one
 * digit per question, each naming an option that exists.
 */
export function decodeAnswers(text: string, optionCounts: readonly number[]): number[] | null {
  if (text.length !== optionCounts.length || !/^\d+$/.test(text)) return null;
  const answers = [...text].map(Number);
  return answers.every((answer, i) => answer < optionCounts[i]!) ? answers : null;
}
