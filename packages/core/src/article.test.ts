import { describe, expect, it } from "vitest";

import { ARTICLE_FILE, parseArticle, sortArticles } from "./article";

const source = (header: string, body = "Birinci paragraf.\n\nİkinci\nparagraf.") =>
  `---\n${header}\n---\n\n${body}\n`;

describe("parseArticle", () => {
  it("reads the header and the paragraphs", () => {
    expect(
      parseArticle(
        "oran",
        source(
          "title: Demleme oranı nedir?\nsummary: Kahvenin suya oranı.\nreadingMinutes: 1\norder: 4\nimage: bilgi-oran",
        ),
      ),
    ).toEqual({
      slug: "oran",
      title: "Demleme oranı nedir?",
      summary: "Kahvenin suya oranı.",
      readingMinutes: 1,
      order: 4,
      image: "bilgi-oran",
      paragraphs: ["Birinci paragraf.", "İkinci paragraf."],
    });
  });

  it("keeps colons inside a value and leaves optional numbers out", () => {
    const article = parseArticle("oran", source("title: Oran: 1:16 mı?\nsummary: Evet."));
    expect(article.title).toBe("Oran: 1:16 mı?");
    expect(article.readingMinutes).toBeNull();
    expect(article.image).toBeNull();
  });

  it("stops on a file that breaks the rules, naming it", () => {
    expect(() => parseArticle("bos", "Başlık yok.")).toThrow(/bos\.md/);
    expect(() => parseArticle("x", source("summary: Özet."))).toThrow(/title/);
    expect(() => parseArticle("x", source(`title: ${"a".repeat(61)}\nsummary: Özet.`))).toThrow(
      /60/,
    );
    expect(() => parseArticle("x", source("title: Başlık\nsummary: Özet.\norder: iki"))).toThrow(
      /order/,
    );
    expect(() =>
      parseArticle("x", source("title: Başlık\nsummary: Özet.\nimage: ../gizli.png")),
    ).toThrow(/image/);
    expect(() =>
      parseArticle("x", source("title: Başlık\nsummary: Özet.", "kelime ".repeat(301))),
    ).toThrow(/301 kelime/);
  });
});

describe("articles", () => {
  it("are the lower-case .md files, by order then title", () => {
    expect(ARTICLE_FILE.exec("ogutme.md")?.[1]).toBe("ogutme");
    expect(ARTICLE_FILE.test("README.md")).toBe(false);
    const make = (slug: string, title: string, order: number) => ({
      slug,
      title,
      summary: "",
      readingMinutes: null,
      order,
      image: null,
      paragraphs: [],
    });
    expect(
      sortArticles([make("c", "Çay", 2), make("b", "Bal", 2), make("a", "Zeytin", 1)]).map(
        ({ slug }) => slug,
      ),
    ).toEqual(["a", "b", "c"]);
  });
});
