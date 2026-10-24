import { describe, expect, it } from "vitest";

import { ARTICLE_FILE, parseArticle, sortArticles, type Article } from "./article";

const source = (header: string, body = "Birinci paragraf.\n\nİkinci\nparagraf.") =>
  `---\n${header}\n---\n\n${body}\n`;

const GUIDE_HEADER = [
  "title: V60 nedir, nasıl demlenir?",
  "summary: Koni biçimli bir filtre.",
  "topic: demleme",
  "method: V60",
  "dose: 15 g",
  "water: 250 ml",
  "temperature: 93 °C",
  "time: 2,5–3 dk",
  "grind: Orta",
  "icon: funnel",
].join("\n");

describe("parseArticle", () => {
  it("reads the header and the paragraphs", () => {
    expect(
      parseArticle(
        "oran",
        source(
          "title: Demleme oranı nedir?\nsummary: Kahvenin suya oranı.\nreadingMinutes: 1\norder: 4\ntopic: temel\nimage: bilgi-oran",
        ),
      ),
    ).toEqual({
      slug: "oran",
      title: "Demleme oranı nedir?",
      summary: "Kahvenin suya oranı.",
      readingMinutes: 1,
      order: 4,
      topic: "temel",
      image: "bilgi-oran",
      icon: null,
      recipe: null,
      blocks: [
        { kind: "paragraph", text: "Birinci paragraf." },
        { kind: "paragraph", text: "İkinci paragraf." },
      ],
    });
  });

  it("keeps colons inside a value and leaves optional numbers out", () => {
    const article = parseArticle(
      "oran",
      source("title: Oran: 1:16 mı?\nsummary: Evet.\ntopic: temel"),
    );
    expect(article.title).toBe("Oran: 1:16 mı?");
    expect(article.readingMinutes).toBeNull();
    expect(article.image).toBeNull();
  });

  it("reads a guide: its recipe, subheadings and numbered steps", () => {
    const guide = parseArticle(
      "v60",
      source(
        GUIDE_HEADER,
        "Giriş paragrafı.\n\n## Nasıl demlenir?\n\n1. Suyu ısıt.\n2. Filtreyi ıslat.\n\nSon paragraf.",
      ),
    );
    expect(guide.recipe).toEqual({
      method: "V60",
      dose: "15 g",
      water: "250 ml",
      temperature: "93 °C",
      time: "2,5–3 dk",
      grind: "Orta",
    });
    expect(guide.icon).toBe("funnel");
    expect(guide.blocks).toEqual([
      { kind: "paragraph", text: "Giriş paragrafı." },
      { kind: "heading", text: "Nasıl demlenir?" },
      { kind: "steps", items: ["Suyu ısıt.", "Filtreyi ıslat."] },
      { kind: "paragraph", text: "Son paragraf." },
    ]);
    // Up to 600 words in a guide.
    expect(() => parseArticle("v60", source(GUIDE_HEADER, "kelime ".repeat(600)))).not.toThrow();
    expect(() => parseArticle("v60", source(GUIDE_HEADER, "kelime ".repeat(601)))).toThrow(
      /601 kelime/,
    );
  });

  it("stops on a file that breaks the rules, naming it", () => {
    const plain = "title: Başlık\nsummary: Özet.\ntopic: temel";
    expect(() => parseArticle("bos", "Başlık yok.")).toThrow(/bos\.md/);
    expect(() => parseArticle("x", source("summary: Özet.\ntopic: temel"))).toThrow(/title/);
    expect(() =>
      parseArticle("x", source(`title: ${"a".repeat(61)}\nsummary: Özet.\ntopic: temel`)),
    ).toThrow(/60/);
    expect(() => parseArticle("x", source(`${plain}\norder: iki`))).toThrow(/order/);
    expect(() => parseArticle("x", source(`${plain}\nimage: ../gizli.png`))).toThrow(/image/);
    expect(() => parseArticle("x", source(plain, "kelime ".repeat(301)))).toThrow(/301 kelime/);
    expect(() => parseArticle("x", source("title: Başlık\nsummary: Özet."))).toThrow(/topic/);
    expect(() => parseArticle("x", source("title: Başlık\nsummary: Özet.\ntopic: tarih"))).toThrow(
      /topic "tarih"/,
    );
    // Recipes, subheadings and steps belong to guides.
    expect(() => parseArticle("x", source(`${plain}\ndose: 15 g`))).toThrow(/dose/);
    expect(() => parseArticle("x", source(plain, "## Ara başlık\n\nParagraf."))).toThrow(
      /rehberinde/,
    );
    expect(() => parseArticle("x", source(plain, "1. Bir.\n2. İki.\n\nParagraf."))).toThrow(
      /rehberinde/,
    );
    expect(() => parseArticle("x", source(GUIDE_HEADER.replace("grind: Orta\n", "")))).toThrow(
      /grind/,
    );
    expect(() => parseArticle("x", source(GUIDE_HEADER, "## Başlık\nhemen altında metin"))).toThrow(
      /kendi satırında/,
    );
  });
});

describe("articles", () => {
  it("are the lower-case .md files, by order then title", () => {
    expect(ARTICLE_FILE.exec("ogutme.md")?.[1]).toBe("ogutme");
    expect(ARTICLE_FILE.test("README.md")).toBe(false);
    const make = (slug: string, title: string, order: number): Article => ({
      slug,
      title,
      summary: "",
      readingMinutes: null,
      order,
      topic: "temel",
      image: null,
      icon: null,
      recipe: null,
      blocks: [],
    });
    expect(
      sortArticles([make("c", "Çay", 2), make("b", "Bal", 2), make("a", "Zeytin", 1)]).map(
        ({ slug }) => slug,
      ),
    ).toEqual(["a", "b", "c"]);
  });
});
