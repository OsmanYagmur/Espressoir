/**
 * The brewing assistant's arithmetic (a guide's page): a recipe scaled to a number of
 * cups, where a running brew stands on its plan, how an espresso shot ran, when a cold
 * brew is ready. Pure and without a clock of its own: the caller passes the seconds since
 * the start (or the moment it began), so the same plan works in the browser and the app.
 * The plans themselves, with their words, are the website's content (src/content/demleme.ts).
 */

/** One thing to do while brewing, from `at` seconds until the next stage begins. */
export interface BrewStage {
  at: number;
  /** What to do, short: "Islat". */
  title: string;
  /** How, in one sentence. */
  detail: string;
  /** Pour until the scale shows this much water, for one cup. */
  pourTo?: number;
  /** The moment is a sign to watch for (the foam rises, the pot gurgles), not a time. */
  cue?: boolean;
}

/** An espresso's timing: the window it should land in, and the edges past which it is off. */
export interface ShotTarget {
  /** Shorter than this: far too fast. */
  fast: number;
  from: number;
  to: number;
  /** Longer than this: far too slow. */
  slow: number;
}

interface PlanBase {
  /** One cup's coffee, in grams. */
  dose: number;
  /** One cup's water: millilitres, or grams in the cup for espresso. */
  water: number;
  waterUnit: "ml" | "g";
  /** How many cups the method makes at once; 1 hides the choice. */
  maxCups: number;
}

/** A brew on a clock: stages, the moment it is done, an espresso's target. */
export interface TimedPlan extends PlanBase {
  kind: "timed";
  stages: BrewStage[];
  /** Seconds from the start when the cup is ready. */
  end: number;
  /** What to do once it is: one sentence. */
  finish: string;
  shot?: ShotTarget;
}

/** A brew of hours (cold brew): no stages to follow, a time it is ready instead. */
export interface SteepPlan extends PlanBase {
  kind: "steep";
  hours: { from: number; to: number };
}

export type BrewPlan = TimedPlan | SteepPlan;

/** Water is poured to the nearest 5 ml; grams, weighed in the cup, to the gram. */
function waterStep(plan: Pick<PlanBase, "waterUnit">): number {
  return plan.waterUnit === "ml" ? 5 : 1;
}

const roundTo = (value: number, step: number) => Math.round(value / step) * step;

/** Cups within what the method makes at once. */
export function clampCups(plan: Pick<PlanBase, "maxCups">, cups: number): number {
  return Math.min(Math.max(Math.round(cups), 1), plan.maxCups);
}

/** The recipe for `cups` cups: coffee to the gram, water to the scale's step. */
export function scaleRecipe(plan: BrewPlan, cups: number): { dose: number; water: number } {
  const n = clampCups(plan, cups);
  return { dose: Math.round(plan.dose * n), water: roundTo(plan.water * n, waterStep(plan)) };
}

/** Where to pour to in this stage for `cups` cups (null: the stage does not pour). */
export function scaledPour(plan: BrewPlan, stage: BrewStage, cups: number): number | null {
  if (stage.pourTo === undefined) return null;
  return roundTo(stage.pourTo * clampCups(plan, cups), waterStep(plan));
}

/** "1:16": water per gram of coffee, a decimal comma where it is not whole ("1:15,3"). */
export function formatRatio(dose: number, water: number): string {
  const ratio = Math.round((water / dose) * 10) / 10;
  return `1:${String(ratio).replace(".", ",")}`;
}

/** "0:45", "12:05": minutes and seconds, the way a kitchen timer shows them. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export interface BrewState {
  /** The stage under way (the last one once the brew is done). */
  index: number;
  /** Seconds until the next stage, or until the end after the last one. */
  remaining: number;
  done: boolean;
  /** How far along the whole brew is, 0 to 1. */
  progress: number;
}

/** Where a timed brew stands `seconds` after it started. */
export function brewState(plan: TimedPlan, seconds: number): BrewState {
  const elapsed = Math.max(0, seconds);
  let index = 0;
  plan.stages.forEach((stage, i) => {
    if (stage.at <= elapsed) index = i;
  });
  const nextAt = plan.stages[index + 1]?.at ?? plan.end;
  return {
    index,
    remaining: Math.max(0, nextAt - elapsed),
    done: elapsed >= plan.end,
    progress: Math.min(1, elapsed / plan.end),
  };
}

export type ShotVerdict = "tooFast" | "fast" | "good" | "slow" | "tooSlow";

/** How a shot that ran `seconds` sits against its target. */
export function shotVerdict(target: ShotTarget, seconds: number): ShotVerdict {
  if (seconds < target.fast) return "tooFast";
  if (seconds < target.from) return "fast";
  if (seconds <= target.to) return "good";
  if (seconds <= target.slow) return "slow";
  return "tooSlow";
}

/** When a steep that starts at `start` is ready: the earliest and the latest moment. */
export function readyWindow(plan: SteepPlan, start: Date): { from: Date; to: Date } {
  const hour = 60 * 60 * 1000;
  return {
    from: new Date(start.getTime() + plan.hours.from * hour),
    to: new Date(start.getTime() + plan.hours.to * hour),
  };
}

/**
 * The numbers a recipe writes as text, as a range in grams or millilitres: "15 g" →
 * [15, 15], "15–17 g" → [15, 17], "1 l" → [1000, 1000], "36 g espresso" → [36, 36].
 * Null when the text has no number.
 */
export function recipeRange(text: string): [number, number] | null {
  const match = /(\d+(?:,\d+)?)(?:\s*[–-]\s*(\d+(?:,\d+)?))?\s*(l|ml|g)?\b/.exec(text);
  if (!match) return null;
  const factor = match[3] === "l" ? 1000 : 1;
  const read = (value: string) => Number(value.replace(",", ".")) * factor;
  const low = read(match[1]!);
  return [low, match[2] ? read(match[2]) : low];
}
