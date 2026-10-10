import { describe, expect, it } from "vitest";
import { format, getDictionary } from "./index";

describe("format", () => {
  it("fills named placeholders", () => {
    expect(format("{score}/10", { score: 8 })).toBe("8/10");
    expect(format("© {year} {name}", { year: 2026, name: "Espressoir" })).toBe("© 2026 Espressoir");
  });

  it("leaves unknown placeholders visible", () => {
    expect(format("{a} ve {b}", { a: "x" })).toBe("x ve {b}");
  });
});

describe("getDictionary", () => {
  it("returns Turkish by default", () => {
    expect(getDictionary().nav.coffees).toBe("Kahveler");
  });
});
