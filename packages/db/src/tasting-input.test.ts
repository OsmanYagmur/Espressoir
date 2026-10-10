import { describe, expect, it } from "vitest";

import { tastingInputSchema, toLogTastingArgs, toTastingUpdate } from "./tasting-input";

const TODAY = "2026-10-10";
const COFFEE_ID = "0b0e7c1e-6f0a-4a57-9b3c-2f1d9a8e7c11";

const base = {
  coffee: { mode: "existing", coffeeId: COFFEE_ID },
  status: "logged",
  visibility: "public",
  brewMethodSlug: "v60",
  device: "",
  score: 8,
  tastedAt: "2026-10-09",
  notes: "  Yumuşak içimli.  ",
  body: null,
  acidity: null,
  bitterness: null,
  sweetness: null,
  aftertaste: null,
  wouldBuyAgain: null,
  pricePaid: null,
};

const parse = (input: unknown) => tastingInputSchema(TODAY).safeParse(input);
const errors = (input: unknown) => {
  const result = parse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("tastingInputSchema", () => {
  it("accepts a tasting of an existing coffee and tidies its text", () => {
    const result = parse(base);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ notes: "Yumuşak içimli.", device: null, score: 8 });
  });

  it("requires a coffee: an id, or both a brand and a name", () => {
    expect(errors({ ...base, coffee: { mode: "existing", coffeeId: "" } })).toEqual([
      "coffeeRequired",
    ]);
    const blankNew = {
      mode: "new",
      brandName: " ",
      coffeeName: "",
      form: null,
      capsuleSystem: null,
      brandIntensity: null,
      originCountry: null,
    };
    expect(errors({ ...base, coffee: blankNew })).toEqual(["coffeeRequired", "coffeeRequired"]);
  });

  it("keeps scores within 1–10 and dates out of the future", () => {
    expect(errors({ ...base, score: 11 })).toEqual(["scoreRange"]);
    expect(errors({ ...base, score: 0 })).toEqual(["scoreRange"]);
    expect(errors({ ...base, tastedAt: "2026-10-11" })).toEqual(["dateFuture"]);
    expect(errors({ ...base, tastedAt: "10.10.2026" })).toEqual(["dateInvalid"]);
    expect(errors({ ...base, tastedAt: TODAY })).toEqual([]);
  });

  it("limits the note length and rejects a negative price", () => {
    expect(errors({ ...base, notes: "a".repeat(4001) })).toEqual(["notesTooLong"]);
    expect(errors({ ...base, pricePaid: -1 })).toEqual(["priceInvalid"]);
  });

  it("clears score and date on a wishlist entry", () => {
    const result = parse({ ...base, status: "wishlist" });
    expect(result.data).toMatchObject({ status: "wishlist", score: null, tastedAt: null });
  });

  it("drops the capsule system unless the new coffee is a capsule", () => {
    const coffee = {
      mode: "new",
      brandName: " Kahve Dünyası ",
      coffeeName: "Master Ristretto",
      form: "ground",
      capsuleSystem: "nespresso_original",
      brandIntensity: 8,
      originCountry: null,
    };
    expect(parse({ ...base, coffee }).data?.coffee).toMatchObject({
      brandName: "Kahve Dünyası",
      capsuleSystem: null,
    });
    expect(parse({ ...base, coffee: { ...coffee, form: "capsule" } }).data?.coffee).toMatchObject({
      capsuleSystem: "nespresso_original",
    });
  });
});

describe("toLogTastingArgs", () => {
  it("sends only what was filled in, so SQL defaults cover the rest", () => {
    const input = tastingInputSchema(TODAY).parse(base);
    expect(toLogTastingArgs(input)).toEqual({
      p_coffee_id: COFFEE_ID,
      p_status: "logged",
      p_visibility: "public",
      p_brew_method_slug: "v60",
      p_score: 8,
      p_tasted_at: "2026-10-09",
      p_notes: "Yumuşak içimli.",
    });
  });

  it("passes a new coffee by name", () => {
    const input = tastingInputSchema(TODAY).parse({
      ...base,
      coffee: {
        mode: "new",
        brandName: "Kronotrop",
        coffeeName: "Wilder Jungle",
        form: "whole_bean",
        capsuleSystem: null,
        brandIntensity: null,
        originCountry: "ET",
      },
    });
    expect(toLogTastingArgs(input)).toMatchObject({
      p_brand_name: "Kronotrop",
      p_coffee_name: "Wilder Jungle",
      p_form: "whole_bean",
      p_origin_country: "ET",
    });
    expect(toLogTastingArgs(input)).not.toHaveProperty("p_coffee_id");
  });
});

describe("toTastingUpdate", () => {
  it("writes nulls explicitly, so a cleared field is really cleared", () => {
    const input = tastingInputSchema(TODAY).parse({ ...base, score: null, notes: "" });
    expect(toTastingUpdate(input, null)).toMatchObject({
      score: null,
      notes: null,
      brew_method_id: null,
      device: null,
    });
  });
});
