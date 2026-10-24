import "server-only";

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { ARTICLE_FILE, parseArticle, sortArticles, type Article } from "@espressoir/core";
import { cacheLife } from "next/cache";

import { isPhotoId, type PhotoId } from "@/content/photos";

// The articles are files in the app (src/content/bilgi), read by a literal path and
// shipped with every server function (next.config.ts), like the share-image fonts.
const DIRECTORY = join(process.cwd(), "src/content/bilgi");

/** An article with its picture checked against the site's photos. */
export interface SiteArticle extends Article {
  photo: PhotoId | null;
}

function withPhoto(article: Article): SiteArticle {
  const { image } = article;
  if (image === null) return { ...article, photo: null };
  if (!isPhotoId(image)) {
    throw new Error(
      `Bilgi yazısı "${article.slug}.md": image "${image}" src/content/photos.ts içinde yok.`,
    );
  }
  return { ...article, photo: image };
}

/**
 * Every article of the Bilgi page, in list order. Adding one is adding a file to the
 * folder; one that breaks the rules stops the build with a sentence saying why.
 */
export async function getArticles(): Promise<SiteArticle[]> {
  "use cache";
  cacheLife("max");
  const files = (await readdir(DIRECTORY)).sort();
  const articles = await Promise.all(
    files.flatMap((file) => {
      const slug = ARTICLE_FILE.exec(file)?.[1];
      return slug
        ? [
            readFile(join(DIRECTORY, file), "utf8").then((source) =>
              withPhoto(parseArticle(slug, source)),
            ),
          ]
        : [];
    }),
  );
  return sortArticles(articles);
}

export async function getArticle(slug: string): Promise<SiteArticle | null> {
  return (await getArticles()).find((article) => article.slug === slug) ?? null;
}
