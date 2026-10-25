import "server-only";

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  ARTICLE_FILE,
  parseArticle,
  recipeRange,
  sortArticles,
  type Article,
  type BrewPlan,
} from "@espressoir/core";
import { cacheLife } from "next/cache";

import { BREW_PLANS } from "@/content/demleme";
import { isArticleIconId, type ArticleIconId } from "@/content/icons";
import { isPhotoId, type PhotoId } from "@/content/photos";

// The articles are files in the app (src/content/bilgi), read by a literal path and
// shipped with every server function (next.config.ts), like the share-image fonts.
const DIRECTORY = join(process.cwd(), "src/content/bilgi");

/** An article with its picture and icon checked against the site's own. */
export interface SiteArticle extends Article {
  photo: PhotoId | null;
  iconId: ArticleIconId | null;
  /** A guide's brewing assistant (src/content/demleme.ts); null: none. */
  brewPlan: BrewPlan | null;
}

/** A brewing guide: an article with a recipe. */
export type SiteGuide = SiteArticle & { recipe: NonNullable<Article["recipe"]> };

export const isGuide = (article: SiteArticle): article is SiteGuide => article.recipe !== null;

/** Whether `value` lies within the numbers a recipe writes ("15–17 g", "1 l"). */
function within(value: number, text: string): boolean {
  const range = recipeRange(text);
  return range !== null && value >= range[0] && value <= range[1];
}

function checked(article: Article): SiteArticle {
  const { image, icon, slug, recipe } = article;
  const problem = (sentence: string) => new Error(`Bilgi yazısı "${slug}.md": ${sentence}`);
  if (image !== null && !isPhotoId(image)) {
    throw problem(`image "${image}" src/content/photos.ts içinde yok.`);
  }
  if (icon !== null && !isArticleIconId(icon)) {
    throw problem(`icon "${icon}" src/content/icons.ts içinde yok.`);
  }
  const brewPlan = BREW_PLANS[slug] ?? null;
  if (brewPlan !== null) {
    // The assistant scales the recipe the page shows: the two must say the same.
    if (recipe === null) throw problem("demleme planı var ama yazı bir rehber değil (method: yok).");
    if (!within(brewPlan.dose, recipe.dose)) {
      throw problem(`src/content/demleme.ts'teki ${brewPlan.dose} g, tarifteki "${recipe.dose}" değil.`);
    }
    if (!within(brewPlan.water, recipe.water)) {
      throw problem(`src/content/demleme.ts'teki su ${brewPlan.water}, tarifteki "${recipe.water}" değil.`);
    }
  }
  return { ...article, photo: image, iconId: icon, brewPlan };
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
              checked(parseArticle(slug, source)),
            ),
          ]
        : [];
    }),
  );
  const orphan = Object.keys(BREW_PLANS).find(
    (slug) => !articles.some((article) => article.slug === slug),
  );
  if (orphan) throw new Error(`src/content/demleme.ts: "${orphan}" adında bir rehber yok.`);
  return sortArticles(articles);
}

export async function getArticle(slug: string): Promise<SiteArticle | null> {
  return (await getArticles()).find((article) => article.slug === slug) ?? null;
}
