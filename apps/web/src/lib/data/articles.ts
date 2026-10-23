import "server-only";

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { ARTICLE_FILE, parseArticle, sortArticles, type Article } from "@espressoir/core";
import { cacheLife } from "next/cache";

// The articles are files in the app (src/content/bilgi), read by a literal path and
// shipped with every server function (next.config.ts), like the share-image fonts.
const DIRECTORY = join(process.cwd(), "src/content/bilgi");

/**
 * Every article of the Bilgi page, in list order. Adding one is adding a file to the
 * folder; one that breaks the rules stops the build with a sentence saying why.
 */
export async function getArticles(): Promise<Article[]> {
  "use cache";
  cacheLife("max");
  const files = (await readdir(DIRECTORY)).sort();
  const articles = await Promise.all(
    files.flatMap((file) => {
      const slug = ARTICLE_FILE.exec(file)?.[1];
      return slug
        ? [readFile(join(DIRECTORY, file), "utf8").then((source) => parseArticle(slug, source))]
        : [];
    }),
  );
  return sortArticles(articles);
}

export async function getArticle(slug: string): Promise<Article | null> {
  return (await getArticles()).find((article) => article.slug === slug) ?? null;
}
