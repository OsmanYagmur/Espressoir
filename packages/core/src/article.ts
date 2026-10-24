/**
 * Short articles kept as Markdown files (the website's src/content/bilgi): a header of
 * `key: value` lines between two `---` lines, then plain paragraphs separated by a blank
 * line. Plain on purpose: no package to parse it, and nothing in it can be mistaken for
 * markup. The limits are DESIGN.md's (InfoCard and the Bilgi page).
 */

export const ARTICLE_TITLE_MAX_LENGTH = 60;
export const ARTICLE_SUMMARY_MAX_LENGTH = 200;
export const ARTICLE_WORDS_MAX = 300;

/** A file that is an article, and the address it gets: "ogutme.md" → "ogutme". */
export const ARTICLE_FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

/** The name of one of the website's photos ("bilgi-ogutme"); which ones exist is its business. */
const PHOTO_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface Article {
  slug: string;
  title: string;
  summary: string;
  /** "2 dakikalık okuma"; null leaves it out. */
  readingMinutes: number | null;
  /** Place in the list, lowest first. */
  order: number;
  /** The article's one picture (DESIGN.md: "tek görsel"), by name; null: none. */
  image: string | null;
  paragraphs: string[];
}

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

  const title = header.get("title") ?? "";
  const summary = header.get("summary") ?? "";
  if (!title) fail("title boş.");
  if (title.length > ARTICLE_TITLE_MAX_LENGTH) {
    fail(`title ${ARTICLE_TITLE_MAX_LENGTH} karakterden uzun.`);
  }
  if (!summary) fail("summary boş.");
  if (summary.length > ARTICLE_SUMMARY_MAX_LENGTH) {
    fail(`summary ${ARTICLE_SUMMARY_MAX_LENGTH} karakterden uzun.`);
  }

  const number = (key: string): number | null => {
    const value = header.get(key);
    if (value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0
      ? parsed
      : fail(`${key} pozitif bir tam sayı değil.`);
  };

  const image = header.get("image") || null;
  if (image !== null && !PHOTO_NAME.test(image)) {
    fail(`image "${image}" bir fotoğraf adı değil (küçük harf, rakam ve tire).`);
  }

  const paragraphs = (match[2] ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (paragraphs.length === 0) fail("yazının kendisi boş.");
  const words = paragraphs.join(" ").split(" ").length;
  if (words > ARTICLE_WORDS_MAX) fail(`${words} kelime; en fazla ${ARTICLE_WORDS_MAX}.`);

  return {
    slug,
    title,
    summary,
    readingMinutes: number("readingMinutes"),
    order: number("order") ?? Number.MAX_SAFE_INTEGER,
    image,
    paragraphs,
  };
}

/** Articles in their list order: `order`, then title. */
export function sortArticles<T extends Article>(articles: readonly T[]): T[] {
  return [...articles].sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, "tr"));
}
