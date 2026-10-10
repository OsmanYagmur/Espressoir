import { describe, expect, it } from "vitest";
import { isValidScore, scoreTier } from "./score";

describe("scoreTier", () => {
  it.each([
    [1, "low"],
    [3, "low"],
    [4, "fair"],
    [5, "fair"],
    [6, "good"],
    [7, "good"],
    [8, "great"],
    [9, "exceptional"],
    [10, "exceptional"],
  ] as const)("%i → %s", (score, tier) => {
    expect(scoreTier(score)).toBe(tier);
  });
});

describe("isValidScore", () => {
  it("accepts integers 1–10 only", () => {
    expect(isValidScore(1)).toBe(true);
    expect(isValidScore(10)).toBe(true);
    expect(isValidScore(0)).toBe(false);
    expect(isValidScore(11)).toBe(false);
    expect(isValidScore(7.5)).toBe(false);
    expect(isValidScore("8")).toBe(false);
  });
});
