import { describe, expect, it } from "vitest";

import { MAP_URL_PATTERN, TR_CITIES, cityByCode, cityBySlug } from "./cafe";
import { slugify } from "./text/slugify";

describe("TR_CITIES", () => {
  it("has the 81 provinces in plate order, each slug made the usual way", () => {
    expect(TR_CITIES).toHaveLength(81);
    TR_CITIES.forEach((city, index) => {
      expect(city.code).toBe(index + 1);
      expect(city.slug).toBe(slugify(city.name));
    });
    expect(new Set(TR_CITIES.map((city) => city.slug)).size).toBe(81);
  });

  it("finds a city by plate number and by slug", () => {
    expect(cityByCode(34)?.name).toBe("İstanbul");
    expect(cityByCode(82)).toBeUndefined();
    expect(cityBySlug("izmir")?.code).toBe(35);
    expect(cityBySlug("hakkari")?.name).toBe("Hakkâri");
  });
});

describe("MAP_URL_PATTERN", () => {
  it("accepts links from the common map services", () => {
    for (const url of [
      "https://maps.app.goo.gl/AbC123",
      "https://www.google.com/maps/place/Kahve/@41.0,29.0,17z",
      "https://www.google.com.tr/maps?q=kahve",
      "https://maps.google.com/?q=41.0,29.0",
      "https://goo.gl/maps/xyz",
      "https://maps.apple.com/?q=kahve",
      "https://www.openstreetmap.org/node/123",
      "https://yandex.com.tr/maps/-/abc",
    ]) {
      expect(url).toMatch(MAP_URL_PATTERN);
    }
  });

  it("refuses anything else", () => {
    for (const url of [
      "http://maps.app.goo.gl/AbC123",
      "https://evil.example/maps.app.goo.gl/",
      "https://maps.app.goo.gl.evil.example/x",
      "https://www.google.com/search?q=kahve",
      "https://google.evil.com/maps/x",
      "https://maps.google.evil.example/x",
      "javascript:alert(1)",
      "https://maps.app.goo.gl/a b",
    ]) {
      expect(url).not.toMatch(MAP_URL_PATTERN);
    }
  });
});
