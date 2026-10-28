import { ArrowRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PhotoImage } from "@/components/site/photo";
import { isGuide, type SiteArticle } from "@/lib/data/articles";
import { format, t } from "@/lib/i18n";

import { recipeAmounts, recipeTiming } from "./guide-card";

/**
 * The article a page leads with: its picture beside the question on a wide screen, above it
 * on a phone; the summary, a guide's numbers, the reading time and one link, which covers
 * the whole frame.
 */
export function FeaturedArticle({
  article,
  kicker,
  action,
}: {
  article: SiteArticle;
  kicker: string;
  action: string;
}) {
  return (
    <article className="group relative grid overflow-hidden rounded-lg border border-line bg-surface transition-[border-color] hover:border-line-strong md:grid-cols-2">
      {article.photo ? (
        <div className="aspect-video overflow-hidden bg-sunk md:aspect-auto md:min-h-80">
          <PhotoImage
            id={article.photo}
            decorative
            sizes="(min-width: 768px) 560px, 100vw"
            className="size-full transition-transform duration-(--motion-slow) group-hover:scale-105"
          />
        </div>
      ) : null}
      <div className="flex flex-col justify-center gap-3 p-6 md:p-8">
        <p className="type-kicker">{kicker}</p>
        <h2 className="type-title">{article.title}</h2>
        <p className="type-lead">{article.summary}</p>
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
          className="mt-2 inline-flex items-center gap-2 self-start font-semibold text-accent-ink underline underline-offset-3 after:absolute after:inset-0"
        >
          {action}
          <span className="sr-only">: {article.title}</span>
          <ArrowRightIcon
            aria-hidden
            className="size-5 stroke-[1.5] transition-transform group-hover:translate-x-1"
          />
        </Link>
      </div>
    </article>
  );
}
