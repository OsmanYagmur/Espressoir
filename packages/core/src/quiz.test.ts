import { describe, expect, it } from "vitest";

import { decodeAnswers, encodeAnswers, tally } from "./quiz";

describe("tally", () => {
  const order = ["v60", "press", "moka"] as const;

  it("picks the choice with the most points", () => {
    expect(tally(order, [{ press: 2 }, { moka: 1, press: 1 }, { v60: 2 }])).toBe("press");
  });

  it("breaks ties by the order", () => {
    expect(tally(order, [{ press: 2 }, { moka: 2 }])).toBe("press");
    expect(tally(order, [])).toBe("v60");
  });
});

describe("answers in the address", () => {
  it("go there and back", () => {
    expect(encodeAnswers([0, 2, 1])).toBe("021");
    expect(decodeAnswers("021", [2, 3, 2])).toEqual([0, 2, 1]);
  });

  it("refuse what does not fit the questions", () => {
    expect(decodeAnswers("02", [2, 3, 2])).toBeNull();
    expect(decodeAnswers("031", [2, 3, 2])).toBeNull();
    expect(decodeAnswers("0a1", [2, 3, 2])).toBeNull();
  });
});
