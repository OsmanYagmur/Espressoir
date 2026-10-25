import { describe, expect, it } from "vitest";

import { prepareSearch, search, type SearchEntry } from "./search";

const entries: SearchEntry[] = [
  { kind: "coffee", title: "Master Espresso", detail: "Kahve Dünyası", href: "/k/1" },
  { kind: "coffee", title: "Espresso 57 Dark&Chocolatey", detail: "Davidoff", href: "/k/2" },
  { kind: "brand", title: "Kahve Dünyası", detail: "4 kahve", href: "/m/1" },
  {
    kind: "article",
    title: "Espresso makinesi nasıl ayarlanır?",
    detail: "İyi bir espresso üç sayıya bakar.",
    href: "/b/1",
    keywords: "Espresso",
  },
  { kind: "cafe", title: "Montag", detail: "Kadıköy, İstanbul", href: "/c/1" },
  { kind: "member", title: "@osman", detail: "Osman Yağmur", href: "/u/osman" },
];
const index = prepareSearch(entries);
const titles = (query: string) =>
  search(index, query).flatMap((group) => group.entries.map((entry) => entry.title));

describe("search", () => {
  it("finds nothing for an empty query", () => {
    expect(search(index, "  ")).toEqual([]);
  });

  it("folds Turkish letters and case", () => {
    expect(titles("kahve dunyasi")).toEqual(["Kahve Dünyası", "Master Espresso"]);
    expect(titles("İSTANBUL")).toEqual(["Montag"]);
    expect(titles("yagmur")).toEqual(["@osman"]);
  });

  it("needs every word, and ranks a word's start above its inside", () => {
    expect(titles("espresso dark")).toEqual(["Espresso 57 Dark&Chocolatey"]);
    expect(titles("press")).toEqual([
      "Espresso makinesi nasıl ayarlanır?",
      "Master Espresso",
      "Espresso 57 Dark&Chocolatey",
    ]);
  });

  it("groups by kind in a fixed order and caps each group", () => {
    const groups = search(index, "espresso", 1);
    expect(groups.map((group) => group.kind)).toEqual(["article", "coffee"]);
    expect(groups[1]).toMatchObject({ total: 2 });
    expect(groups[1]!.entries).toHaveLength(1);
  });

  it("does not match two letters inside a word", () => {
    expect(titles("ag")).toEqual([]);
  });
});
