import { describe, expect, it } from "vitest";

import { countTags, hasRadarShape, radarPoint, tasteMeans, type TasteProfile } from "./taste";

const profile = (values: Partial<TasteProfile>): TasteProfile => ({
  body: null,
  acidity: null,
  bitterness: null,
  sweetness: null,
  aftertaste: null,
  ...values,
});

describe("tasteMeans", () => {
  it("averages each dimension over the tastings that rated it", () => {
    const means = tasteMeans([
      profile({ body: 4, acidity: 2 }),
      profile({ body: 5 }),
      profile({ body: 3, acidity: 3, sweetness: 1 }),
    ]);
    expect(means.map(({ dimension }) => dimension)).toEqual([
      "body",
      "acidity",
      "bitterness",
      "sweetness",
      "aftertaste",
    ]);
    expect(means[0]).toEqual({ dimension: "body", n: 3, mean: 4, small: false });
    expect(means[1]).toEqual({ dimension: "acidity", n: 2, mean: 2.5, small: true });
    expect(means[2]).toEqual({ dimension: "bitterness", n: 0, mean: null, small: true });
    expect(means[3]).toEqual({ dimension: "sweetness", n: 1, mean: 1, small: true });
  });

  it("has nothing to say about no tastings", () => {
    expect(tasteMeans([]).every(({ n, mean }) => n === 0 && mean === null)).toBe(true);
  });
});

describe("hasRadarShape", () => {
  it("needs three corners", () => {
    expect(hasRadarShape([4, null, 3, null, null])).toBe(false);
    expect(hasRadarShape([4, null, 3, 2, null])).toBe(true);
  });
});

describe("radarPoint", () => {
  it("starts at the top and goes clockwise", () => {
    expect(radarPoint(0, 4, 5)).toEqual({ x: 0, y: -1 });
    expect(radarPoint(1, 4, 5)).toEqual({ x: 1, y: 0 });
    expect(radarPoint(2, 4, 5)).toEqual({ x: 0, y: 1 });
    expect(radarPoint(3, 4, 5)).toEqual({ x: -1, y: 0 });
  });

  it("scales with the value and stays inside the rim", () => {
    expect(radarPoint(0, 5, 2.5)).toEqual({ x: 0, y: -0.5 });
    expect(radarPoint(0, 5, 0)).toEqual({ x: 0, y: 0 });
    expect(radarPoint(0, 5, 9)).toEqual({ x: 0, y: -1 });
    expect(radarPoint(1, 5, 5)).toEqual({ x: 0.9511, y: -0.309 });
  });
});

describe("countTags", () => {
  it("counts each tag once per tasting, most used first", () => {
    const { tags, n } = countTags(
      [["kakao", "findik"], ["kakao"], [], ["findik", "kakao", "bal"]],
      ["bal", "findik", "kakao"],
    );
    expect(n).toBe(3);
    expect(tags).toEqual([
      { slug: "kakao", count: 3 },
      { slug: "findik", count: 2 },
      { slug: "bal", count: 1 },
    ]);
  });

  it("breaks ties by the order of the reference list", () => {
    const { tags } = countTags([["vanilya", "bal"]], ["bal", "vanilya"]);
    expect(tags.map(({ slug }) => slug)).toEqual(["bal", "vanilya"]);
  });
});
