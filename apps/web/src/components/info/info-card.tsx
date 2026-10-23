import type { Article } from "@espressoir/core";
import type { Route } from "next";
import Link from "next/link";

import { cardClass } from "@/components/ui/card";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * InfoCard (DESIGN.md): the question, its two-sentence answer, how long the article takes
 * to read, and "Devamını oku". Only that link leads on; it names the article for readers
 * who hear the links listed on their own.
 */
export function InfoCard({
  article,
  heading: Heading = "h3",
}: {
  article: Article;
  heading?: "h2" | "h3";
}) {
  return (
    <article className={cn(cardClass, "flex h-full flex-col gap-2")}>
      <Heading className="type-card-title">{article.title}</Heading>
      <p>{article.summary}</p>
      {article.readingMinutes ? (
        <p className="type-meta">
          {format(t.info.readingTime, { minutes: article.readingMinutes })}
        </p>
      ) : null}
      <Link
        href={`/bilgi/${article.slug}` as Route}
        className="mt-auto self-start pt-1 text-accent-ink underline underline-offset-3"
      >
        {t.info.readMore}
        <span className="sr-only">: {article.title}</span>
      </Link>
    </article>
  );
}
