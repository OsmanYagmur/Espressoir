import type { Route } from "next";
import Link from "next/link";

import { PhotoImage } from "@/components/site/photo";
import { cardClass } from "@/components/ui/card";
import { isGuide, type SiteArticle } from "@/lib/data/articles";

import { recipeAmounts, recipeTiming } from "./guide-card";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * InfoCard (DESIGN.md): the article's picture, the question, its two-sentence answer (a
 * guide adds its recipe's numbers), how long it takes to read, and "Devamını oku". That link is the only one; it names the
 * article for readers who hear the links listed on their own, and it stretches over the
 * card, so a click anywhere on it leads on.
 */
export function InfoCard({
  article,
  heading: Heading = "h3",
}: {
  article: SiteArticle;
  heading?: "h2" | "h3";
}) {
  return (
    <article
      className={cn(
        cardClass,
        "group relative flex h-full flex-col gap-2 overflow-hidden transition-[border-color,translate] hover:-translate-y-0.5 hover:border-line-strong",
      )}
    >
      {article.photo ? (
        <div className="-mx-4 -mt-4 mb-2 aspect-video overflow-hidden bg-sunk md:-mx-6 md:-mt-6">
          <PhotoImage
            id={article.photo}
            decorative
            sizes="(min-width: 768px) 640px, 100vw"
            className="size-full transition-transform duration-(--motion-slow) group-hover:scale-105"
          />
        </div>
      ) : null}
      <Heading className="type-card-title">{article.title}</Heading>
      <p>{article.summary}</p>
      {isGuide(article) ? (
        <p className="type-figure text-ink-2">
          {recipeAmounts(article)} · {recipeTiming(article)}
        </p>
      ) : null}
      {article.readingMinutes ? (
        <p className="type-meta">
          {format(t.info.readingTime, { minutes: article.readingMinutes })}
        </p>
      ) : null}
      <Link
        href={`/bilgi/${article.slug}` as Route}
        className="mt-auto self-start pt-1 text-accent-ink underline underline-offset-3 after:absolute after:inset-0"
      >
        {t.info.readMore}
        <span className="sr-only">: {article.title}</span>
      </Link>
    </article>
  );
}
