import { describe, expect, it } from "vitest";

import { recommendCoffees, type RatedTasting } from "./recommend";
import type { TasteProfile } from "./taste";

const blank: TasteProfile = {
  body: null,
  acidity: null,
  bitterness: null,
  sweetness: null,
  aftertaste: null,
};

/** [body, acidity, bitterness, sweetness, aftertaste] */
const profile = (values: (number | null)[]): TasteProfile => ({
  body: values[0] ?? null,
  acidity: values[1] ?? null,
  bitterness: values[2] ?? null,
  sweetness: values[3] ?? null,
  aftertaste: values[4] ?? null,
});

const tasting = (
  memberId: string,
  coffeeId: string,
  score: number | null,
  extra: { taste?: TasteProfile; tags?: string[] } = {},
): RatedTasting => ({
  memberId,
  coffeeId,
  score,
  taste: extra.taste ?? blank,
  tags: extra.tags ?? [],
});

const BOLD = profile([5, 1, 4, 2, 4]);
const BRIGHT = profile([2, 5, 1, 4, 3]);

// The member likes bold, chocolatey coffees and dislikes a bright one.
const mine = [
  tasting("me", "ristretto", 9, { taste: BOLD, tags: ["kakao", "bitter-cikolata"] }),
  tasting("me", "napoli", 8, { taste: profile([5, 2, 4, 2, 4]), tags: ["kakao"] }),
  tasting("me", "kenya", 4, { taste: BRIGHT, tags: ["narenciye"] }),
];

describe("recommendCoffees", () => {
  it("waits for three scored tastings", () => {
    expect(recommendCoffees({ mine: mine.slice(0, 2), others: [] })).toEqual({
      status: "too_few",
      scored: 2,
    });
    const unscored = [...mine.slice(0, 2), tasting("me", "x", null)];
    expect(recommendCoffees({ mine: unscored, others: [] })).toMatchObject({ scored: 2 });
  });

  it("puts a coffee that tastes like the member's favourites first, and says so", () => {
    const result = recommendCoffees({
      mine,
      others: [
        tasting("ada", "dark", 8, { taste: profile([5, 1, 4, 2, 5]) }),
        tasting("ada", "dark", 8, { taste: profile([5, 1, 5, 2, 4]) }),
        tasting("bob", "ethiopia", 8, { taste: BRIGHT }),
        tasting("bob", "ethiopia", 8, { taste: BRIGHT }),
      ],
    });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.items.map((item) => item.coffeeId)).toEqual(["dark", "ethiopia"]);
    expect(result.items[0]!.reason).toMatchObject({ kind: "taste" });
    expect(result.items[0]!.signals.taste).toBeGreaterThan(result.items[1]!.signals.taste!);
  });

  it("names the flavour tags it matched on", () => {
    const result = recommendCoffees({
      mine,
      others: [tasting("ada", "mocha", 7, { tags: ["kakao", "bitter-cikolata", "karamel"] })],
    });
    expect(result).toMatchObject({
      status: "ok",
      items: [{ coffeeId: "mocha", reason: { kind: "tags", tags: ["kakao", "bitter-cikolata"] } }],
    });
  });

  it("follows members who liked the same coffees", () => {
    const result = recommendCoffees({
      mine,
      others: [
        // Ada and Bob both liked the Ristretto, and both liked the Arpeggio.
        tasting("ada", "ristretto", 9),
        tasting("ada", "arpeggio", 9),
        tasting("ada", "decaf", 3),
        tasting("bob", "ristretto", 8),
        tasting("bob", "arpeggio", 8),
        tasting("bob", "kenya", 2),
        // Cem liked the Arpeggio too, but none of the member's favourites: no vote.
        tasting("cem", "arpeggio", 9),
        tasting("cem", "kenya", 9),
      ],
    });
    expect(result).toMatchObject({
      status: "ok",
      items: [{ coffeeId: "arpeggio", reason: { kind: "together", members: 2, via: "ristretto" } }],
    });
  });

  it("never suggests what the member has had or excluded", () => {
    const result = recommendCoffees({
      mine,
      others: [
        tasting("ada", "ristretto", 9, { tags: ["kakao"] }),
        tasting("ada", "wished", 9, { tags: ["kakao"] }),
        tasting("ada", "new", 9, { tags: ["kakao"] }),
      ],
      exclude: ["wished"],
    });
    expect(result.status === "ok" && result.items.map((item) => item.coffeeId)).toEqual(["new"]);
  });

  it("weighs one tasting less than many, and the community's verdict breaks ties", () => {
    const tags = { tags: ["kakao"] };
    const result = recommendCoffees({
      mine,
      others: [
        tasting("ada", "once", 7, tags),
        tasting("ada", "often", 7, tags),
        tasting("bob", "often", 7, tags),
        tasting("cem", "often", 7, tags),
        tasting("ada", "loved", 10, tags),
        tasting("bob", "loved", 10, tags),
        tasting("cem", "loved", 10, tags),
      ],
    });
    expect(result.status === "ok" && result.items.map((item) => item.coffeeId)).toEqual([
      "loved",
      "often",
      "once",
    ]);
  });
});
