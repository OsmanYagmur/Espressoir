import { describe, expect, it } from "vitest";

import {
  brewState,
  formatClock,
  formatRatio,
  readyWindow,
  recipeRange,
  scaleRecipe,
  scaledPour,
  shotVerdict,
  type SteepPlan,
  type TimedPlan,
} from "./brew";

const v60: TimedPlan = {
  kind: "timed",
  dose: 15,
  water: 240,
  waterUnit: "ml",
  maxCups: 2,
  end: 180,
  finish: "Demliği kaldır.",
  stages: [
    { at: 0, title: "Islat", detail: "", pourTo: 40 },
    { at: 45, title: "Dök", detail: "", pourTo: 140 },
    { at: 75, title: "Dök", detail: "", pourTo: 240 },
    { at: 105, title: "Bekle", detail: "" },
  ],
};

describe("scaleRecipe", () => {
  it("multiplies one cup, within what the method makes at once", () => {
    expect(scaleRecipe(v60, 1)).toEqual({ dose: 15, water: 240 });
    expect(scaleRecipe(v60, 2)).toEqual({ dose: 30, water: 480 });
    expect(scaleRecipe(v60, 5)).toEqual({ dose: 30, water: 480 });
    expect(scaleRecipe(v60, 0)).toEqual({ dose: 15, water: 240 });
  });

  it("rounds millilitres to 5 and grams to 1", () => {
    const press = { ...v60, dose: 7, water: 70, maxCups: 4 };
    expect(scaleRecipe(press, 3)).toEqual({ dose: 21, water: 210 });
    const shot = { ...v60, dose: 18, water: 36, waterUnit: "g" as const, maxCups: 1 };
    expect(scaleRecipe(shot, 1)).toEqual({ dose: 18, water: 36 });
  });
});

describe("scaledPour", () => {
  it("scales a stage's pour and leaves the others alone", () => {
    expect(scaledPour(v60, v60.stages[0]!, 2)).toBe(80);
    expect(scaledPour(v60, v60.stages[3]!, 2)).toBeNull();
  });
});

describe("brewState", () => {
  it("follows the stages and stops at the end", () => {
    expect(brewState(v60, 0)).toEqual({ index: 0, remaining: 45, done: false, progress: 0 });
    expect(brewState(v60, 50)).toMatchObject({ index: 1, remaining: 25, done: false });
    expect(brewState(v60, 120)).toMatchObject({ index: 3, remaining: 60, done: false });
    expect(brewState(v60, 200)).toEqual({ index: 3, remaining: 0, done: true, progress: 1 });
  });

  it("treats a negative time as the start", () => {
    expect(brewState(v60, -5).index).toBe(0);
  });
});

describe("formatting", () => {
  it("writes a timer and a ratio", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(45.9)).toBe("0:45");
    expect(formatClock(725)).toBe("12:05");
    expect(formatRatio(15, 240)).toBe("1:16");
    expect(formatRatio(15, 230)).toBe("1:15,3");
    expect(formatRatio(18, 36)).toBe("1:2");
  });
});

describe("shotVerdict", () => {
  const target = { fast: 20, from: 25, to: 30, slow: 35 };
  it("places a shot against its window", () => {
    expect(shotVerdict(target, 15)).toBe("tooFast");
    expect(shotVerdict(target, 22)).toBe("fast");
    expect(shotVerdict(target, 25)).toBe("good");
    expect(shotVerdict(target, 30)).toBe("good");
    expect(shotVerdict(target, 33)).toBe("slow");
    expect(shotVerdict(target, 40)).toBe("tooSlow");
  });
});

describe("readyWindow", () => {
  it("adds the hours to the start", () => {
    const plan: SteepPlan = {
      kind: "steep",
      dose: 100,
      water: 1000,
      waterUnit: "ml",
      maxCups: 2,
      hours: { from: 12, to: 18 },
    };
    const start = new Date("2026-10-24T20:00:00Z");
    expect(readyWindow(plan, start)).toEqual({
      from: new Date("2026-10-25T08:00:00Z"),
      to: new Date("2026-10-25T14:00:00Z"),
    });
  });
});

describe("recipeRange", () => {
  it("reads the numbers a recipe writes", () => {
    expect(recipeRange("15 g")).toEqual([15, 15]);
    expect(recipeRange("15–17 g")).toEqual([15, 17]);
    expect(recipeRange("1 l")).toEqual([1000, 1000]);
    expect(recipeRange("240 ml")).toEqual([240, 240]);
    expect(recipeRange("36 g espresso")).toEqual([36, 36]);
    expect(recipeRange("2,5–3 dk")).toEqual([2.5, 3]);
    expect(recipeRange("orta")).toBeNull();
  });
});
