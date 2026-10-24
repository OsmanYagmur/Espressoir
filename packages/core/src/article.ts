/**
 * Articles kept as Markdown files (the website's src/content/bilgi): a header of
 * `key: value` lines between two `---` lines, then the text, blocks separated by a blank
 * line. Plain on purpose: no package to parse it, and nothing in it can be mistaken for
 * markup. Two kinds (DESIGN.md → Bilgi):
 *
 * - an article: plain paragraphs, at most ARTICLE_WORDS_MAX words;
 * - a brewing guide, marked by `method:` in the header: a recipe (the header's dose, water,
 *   temperature, time and grind), and besides paragraphs `## ` subheadings and numbered
 *   steps ("1. …" lines), at most GUIDE_WORDS_MAX words.
 */

export const ARTICLE_TITLE_MAX_LENGTH = 60;
export const ARTICLE_SUMMARY_MAX_LENGTH = 200;
export const ARTICLE_WORDS_MAX = 300;
export const GUIDE_WORDS_MAX = 600;

/** The Bilgi page's sections, in the order they are shown. */
export const ARTICLE_TOPICS = ["demleme", "cekirdek", "temel"] as const;
export type ArticleTopic = (typeof ARTICLE_TOPICS)[number];

/** A file that is an article, and the address it gets: "ogutme.md" → "ogutme". */
export const ARTICLE_FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

/** The name of one of the website's photos or icons ("bilgi-ogutme"); which exist is its business. */
const ASSET_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** A guide's recipe, each value written as the reader sees it ("15 g", "2,5–3 dk"). */
export interface Recipe {
  /** The method's short name, for lists: "V60". */
  method: string;
  dose: string;
  water: string;
  /** null where heat is not the point (cold brew writes "Oda sıcaklığı" instead, or nothing). */
  temperature: string | null;
  time: string;
  grind: string;
}

export type ArticleBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "steps"; items: string[] };

export interface Article {
  slug: string;
  title: string;
  summary: string;
  /** "2 dakikalık okuma"; null leaves it out. */
  readingMinutes: number | null;
  /** Place in the list, lowest first. */
  order: number;
  topic: ArticleTopic;
  /** The article's one picture (DESIGN.md: "tek görsel"), by name; null: none. */
  image: string | null;
  /** The icon a guide is listed with, by name; null: none. */
  icon: string | null;
  /** A brewing guide's recipe; null for an article. */
  recipe: Recipe | null;
  blocks: ArticleBlock[];
}

const STEP = /^\d+\.\s+/;
const HEADING = /^##\s+/;
const RECIPE_KEYS = ["method", "dose", "water", "temperature", "time", "grind"] as const;

/** Reads one article; a file that breaks the rules stops with a sentence saying which. */
export function parseArticle(slug: string, source: string): Article {
  const fail = (problem: string): never => {
    throw new Error(`Bilgi yazısı "${slug}.md": ${problem}`);
  };
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(source.replace(/^\uFEFF/, ""));
  if (!match) return fail("üstte --- satırları arasında başlık bilgisi yok.");

  const header = new Map<string, string>();
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const colon = line.indexOf(":");
    if (colon === -1) fail(`"${line}" satırı "ad: değer" biçiminde değil.`);
    header.set(line.slice(0, colon).trim(), line.slice(colon + 1).trim());
  }
  const value = (key: string) => header.get(key) || null;

  const title = value("title") ?? fail("title boş.");
  const summary = value("summary") ?? fail("summary boş.");
  if (title.length > ARTICLE_TITLE_MAX_LENGTH) {
    fail(`title ${ARTICLE_TITLE_MAX_LENGTH} karakterden uzun.`);
  }
  if (summary.length > ARTICLE_SUMMARY_MAX_LENGTH) {
    fail(`summary ${ARTICLE_SUMMARY_MAX_LENGTH} karakterden uzun.`);
  }

  const number = (key: string): number | null => {
    const text = value(key);
    if (text === null) return null;
    const parsed = Number(text);
    return Number.isInteger(parsed) && parsed > 0
      ? parsed
      : fail(`${key} pozitif bir tam sayı değil.`);
  };

  const asset = (key: string): string | null => {
    const name = value(key);
    if (name !== null && !ASSET_NAME.test(name)) {
      fail(`${key} "${name}" bir ad değil (küçük harf, rakam ve tire).`);
    }
    return name;
  };

  const topicText = value("topic");
  const topic =
    ARTICLE_TOPICS.find((candidate) => candidate === topicText) ??
    fail(`topic "${topicText ?? ""}" değil; ${ARTICLE_TOPICS.join(", ")} olmalı.`);

  // A guide is a file with a method; the rest of its recipe comes with it.
  const method = value("method");
  if (method === null) {
    const stray = RECIPE_KEYS.find((key) => header.has(key));
    if (stray) fail(`${stray} yalnızca demleme rehberinde (method: …) olur.`);
  }
  const required = (key: string) => value(key) ?? fail(`rehberde ${key} boş.`);
  const recipe: Recipe | null =
    method === null
      ? null
      : {
          method,
          dose: required("dose"),
          water: required("water"),
          temperature: value("temperature"),
          time: required("time"),
          grind: required("grind"),
        };

  const blocks = (match[2] ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((chunk) =>
      chunk
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((lines) => lines.length > 0)
    .map((lines): ArticleBlock => {
      if (lines.some((line) => HEADING.test(line))) {
        if (lines.length > 1) fail("ara başlık kendi satırında olmalı; altına boş satır bırak.");
        return { kind: "heading", text: lines[0]!.replace(HEADING, "") };
      }
      if (lines.every((line) => STEP.test(line))) {
        return { kind: "steps", items: lines.map((line) => line.replace(STEP, "")) };
      }
      return { kind: "paragraph", text: lines.join(" ").replace(/\s+/g, " ") };
    });
  if (!blocks.some((block) => block.kind === "paragraph")) fail("yazının kendisi boş.");
  if (recipe === null && blocks.some((block) => block.kind !== "paragraph")) {
    fail("ara başlık ve numaralı adım yalnızca demleme rehberinde (method: …) olur.");
  }

  const words = blocks
    .flatMap((block) => (block.kind === "steps" ? block.items : [block.text]))
    .join(" ")
    .split(" ").length;
  const wordsMax = recipe === null ? ARTICLE_WORDS_MAX : GUIDE_WORDS_MAX;
  if (words > wordsMax) fail(`${words} kelime; en fazla ${wordsMax}.`);

  return {
    slug,
    title,
    summary,
    readingMinutes: number("readingMinutes"),
    order: number("order") ?? Number.MAX_SAFE_INTEGER,
    topic,
    image: asset("image"),
    icon: asset("icon"),
    recipe,
    blocks,
  };
}

/** Articles in their list order: `order`, then title. */
export function sortArticles<T extends Article>(articles: readonly T[]): T[] {
  return [...articles].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "tr"));
}
