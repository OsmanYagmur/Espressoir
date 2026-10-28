import { ARTICLE_TOPICS } from "@espressoir/core";
import { SearchIcon } from "lucide-react";
import type { Metadata } from "next";

import { FeaturedArticle } from "@/components/info/featured-article";
import { InfoCard } from "@/components/info/info-card";
import { QuizBand } from "@/components/quiz/quiz-band";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { getArticles, isGuide } from "@/lib/data/articles";
import { format, t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.info.title,
  description: t.info.description,
  alternates: { canonical: "/bilgi" },
};

/**
 * Every guide and article: a search box (it hands the words to /ara), the topics as links
 * to their sections, the first brewing guide as the place to start, the quiz, then each
 * topic's articles: the brewing guides first, then beans and roasts, tasting, the basics.
 */
export default async function InfoPage() {
  const articles = await getArticles();
  const featured = articles.find(isGuide);
  const topics = ARTICLE_TOPICS.map((topic) => ({
    topic,
    articles: articles.filter((article) => article.topic === topic),
  })).filter((group) => group.articles.length > 0);

  return (
    <PageShell>
      <PageHeading title={t.info.title} lead={t.info.lead} />

      {/* A plain GET form: /ara reads ?q= and shows the results as the page opens. */}
      <form action="/ara" role="search" className="flex w-full max-w-read flex-col gap-2">
        <Label htmlFor="bilgi-q">{t.info.searchLabel}</Label>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 stroke-[1.5] text-ink-2"
            />
            <Input
              id="bilgi-q"
              name="q"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder={t.info.searchPlaceholder}
              className="pl-12"
            />
          </div>
          <Button type="submit" variant="secondary">
            {t.info.searchSubmit}
          </Button>
        </div>
      </form>

      <nav aria-label={t.info.topicsLabel} className="mt-6">
        <ul className="flex flex-wrap gap-2">
          {topics.map(({ topic, articles: group }) => (
            <li key={topic}>
              <a
                href={`#${topic}`}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink no-underline transition-colors hover:bg-sunk"
              >
                {t.info.topics[topic]}
                <span className="text-ink-2 tabular-nums">
                  {format(t.info.topicCount, { count: group.length })}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {featured ? (
        <div className="mt-10 md:mt-12">
          <FeaturedArticle
            article={featured}
            kicker={t.info.featuredKicker}
            action={t.info.featuredAction}
          />
        </div>
      ) : null}

      <QuizBand
        id="kahve-testi"
        title={t.home.quizTitle}
        lead={t.home.quizLead}
        action={t.home.quizCta}
        className="mt-4"
      />

      {topics.map(({ topic, articles: group }) => {
        // The featured guide is already on show above.
        const rest = group.filter((article) => article.slug !== featured?.slug);
        if (rest.length === 0) return null;
        return (
          <Section key={topic} id={topic} className="scroll-mt-6">
            <SectionHeading
              id={topic}
              title={t.info.topics[topic]}
              aside={format(t.info.topicCount, { count: group.length })}
            />
            <ul
              aria-labelledby={topic}
              className="grid stagger gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {rest.map((article) => (
                <li key={article.slug}>
                  <InfoCard article={article} heading="h3" />
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
    </PageShell>
  );
}
