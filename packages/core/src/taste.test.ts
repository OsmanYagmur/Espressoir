import { describe, expect, it } from "vitest";

import { countTags, tasteMeans, type TasteProfile } from "./taste";

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
