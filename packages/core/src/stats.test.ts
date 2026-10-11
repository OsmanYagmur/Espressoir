import { describe, expect, it } from "vitest";

import {
  countPoints,
  monthlyCounts,
  scoreHistogram,
  shrunkenMean,
  summarize,
  summarizeBy,
} from "./stats";

describe("summarize", () => {
  it("returns nulls for an empty sample", () => {
    expect(summarize([])).toEqual({
      n: 0,
      mean: null,
      median: null,
      sd: null,
      min: null,
      max: null,
    });
  });

  it("has no standard deviation for a single value", () => {
    expect(summarize([7])).toEqual({ n: 1, mean: 7, median: 7, sd: null, min: 7, max: 7 });
  });

  it("computes mean, median and the sample standard deviation", () => {
    const summary = summarize([8, 2, 8, 5, 6, 7]);
    expect(summary).toMatchObject({ n: 6, mean: 6, median: 6.5, min: 2, max: 8 });
    // Σ(x − 6)² = 4 + 16 + 4 + 1 + 0 + 1 = 26; 26 / 5 = 5.2
    expect(summary.sd).toBeCloseTo(Math.sqrt(5.2), 10);
  });

  it("does not reorder the caller's array", () => {
    const values = [3, 1, 2];
    summarize(values);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe("scoreHistogram", () => {
  it("counts each score from 1 to 10 and ignores anything else", () => {
    expect(scoreHistogram([8, 8, 9, 1, 10, 0, 11, 7.5])).toEqual([1, 0, 0, 0, 0, 0, 0, 2, 1, 1]);
  });
});

describe("summarizeBy", () => {
  const tastings = [
    { brand: "Tchibo", score: 8 },
    { brand: "Tchibo", score: 8 },
    { brand: "Tchibo", score: 6 },
    { brand: "Nescafe", score: 2 },
    { brand: "Kronotrop", score: 8 },
    { brand: "Kronotrop", score: 7 },
    { brand: "Starbucks", score: null },
    { brand: null, score: 9 },
  ];

  it("ranks groups by mean and flags small samples", () => {
    const groups = summarizeBy(
      tastings,
      (t) => t.brand,
      (t) => t.score,
    );
    expect(groups.map((g) => [g.key, g.n, g.mean, g.small])).toEqual([
      ["Kronotrop", 2, 7.5, true],
      ["Tchibo", 3, 22 / 3, false],
      ["Nescafe", 1, 2, true],
    ]);
  });

  it("breaks ties by sample size, then by key", () => {
    const groups = summarizeBy(
      [
        { k: "b", v: 5 },
        { k: "a", v: 5 },
        { k: "c", v: 5 },
        { k: "c", v: 5 },
      ],
      (item) => item.k,
      (item) => item.v,
    );
    expect(groups.map((g) => g.key)).toEqual(["c", "a", "b"]);
  });
});

describe("monthlyCounts", () => {
  it("fills empty months between the first and the last one", () => {
    expect(monthlyCounts(["2025-11-03", "2026-02-01", "2025-11-20", "2026-01-15"])).toEqual([
      { month: "2025-11", count: 2 },
      { month: "2025-12", count: 0 },
      { month: "2026-01", count: 1 },
      { month: "2026-02", count: 1 },
    ]);
  });

  it("handles no dates and a single month", () => {
    expect(monthlyCounts([])).toEqual([]);
    expect(monthlyCounts(["2025-07-07", "2025-07-08"])).toEqual([{ month: "2025-07", count: 2 }]);
  });
});

describe("countPoints", () => {
  it("merges identical points", () => {
    expect(
      countPoints([
        { x: 6, y: 8 },
        { x: 10, y: 9 },
        { x: 6, y: 8 },
      ]),
    ).toEqual([
      { x: 6, y: 8, count: 2 },
      { x: 10, y: 9, count: 1 },
    ]);
  });
});

describe("shrunkenMean", () => {
  it("pulls a mean towards the prior, less so the more data it has", () => {
    // One perfect score among coffees that average 7: (10 + 3·7) / 4.
    expect(shrunkenMean(10, 1, 7)).toBeCloseTo(7.75);
    // Twenty ratings averaging 9 barely move: (180 + 21) / 23.
    expect(shrunkenMean(9, 20, 7)).toBeCloseTo(8.739, 3);
    expect(shrunkenMean(9, 20, 7)).toBeGreaterThan(shrunkenMean(10, 1, 7));
  });

  it("leaves a mean that equals the prior where it is", () => {
    expect(shrunkenMean(7, 5, 7)).toBe(7);
  });
});
