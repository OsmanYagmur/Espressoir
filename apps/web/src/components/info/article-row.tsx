import { ArrowRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import type { SiteArticle } from "@/lib/data/articles";
import { format, t } from "@/lib/i18n";

/**
 * An article as one row of a list: its topic and reading time above the question, the
 * whole row one link. For lists beside a featured article, where cards would repeat the
 * same frame.
 */
export function ArticleRow({
  article,
  heading: Heading = "h3",
}: {
  article: SiteArticle;
  heading?: "h2" | "h3";
}) {
  return (
    <Link
      href={`/bilgi/${article.slug}` as Route}
      className="group flex items-center gap-4 py-4 text-ink no-underline"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="type-meta">
          {t.info.topics[article.topic]}
          {article.readingMinutes
            ? ` · ${format(t.info.readingTime, { minutes: article.readingMinutes })}`
            : null}
        </span>
        <Heading className="font-display text-xl font-semibold group-hover:underline group-hover:underline-offset-4">
          {article.title}
        </Heading>
      </span>
      <ArrowRightIcon
        aria-hidden
        className="size-5 shrink-0 stroke-[1.5] text-accent-ink transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}
