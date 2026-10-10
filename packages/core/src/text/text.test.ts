import { describe, expect, it } from "vitest";
import { foldTurkish } from "./fold-turkish";
import { slugify } from "./slugify";

describe("foldTurkish", () => {
  it.each([
    ["Kahve Dünyası", "kahve dunyasi"],
    ["İntenso Espresso", "intenso espresso"],
    ["ISPARTA ılık ŞEKER", "isparta ilik seker"],
    ["Papua New Guıne", "papua new guine"],
    ["Çiçeksi, ÖZEL, Ğ", "ciceksi, ozel, g"],
    ["Nescafé Crème", "nescafe creme"],
  ])("%s → %s", (input, expected) => {
    expect(foldTurkish(input)).toBe(expected);
  });
});

describe("slugify", () => {
  it.each([
    ["Kurukahveci Mehmet Efendi ", "kurukahveci-mehmet-efendi"],
    ["Ristretto (Siyah Kapsül)", "ristretto-siyah-kapsul"],
    ["Espresso 57 Dark&Chocolatey", "espresso-57-dark-chocolatey"],
    ["Rich Aroma Vivio&Spicy", "rich-aroma-vivio-spicy"],
    ["Jacob’s", "jacobs"],
    ["Jacob's", "jacobs"],
    ["  Explore Ethiopia ", "explore-ethiopia"],
    ["İstanbul Espresso", "istanbul-espresso"],
    ["Single-Origin Colombia", "single-origin-colombia"],
    ["!!!", ""],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("caps length without leaving a trailing dash", () => {
    const slug = slugify(`${"a".repeat(79)} bcd`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});
