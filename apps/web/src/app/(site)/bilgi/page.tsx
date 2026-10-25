import { ARTICLE_TOPICS } from "@espressoir/core";
import type { Metadata } from "next";

import { InfoCard } from "@/components/info/info-card";
import { QuizBand } from "@/components/quiz/quiz-band";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { getArticles } from "@/lib/data/articles";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.info.title,
  description: t.info.description,
  alternates: { canonical: "/bilgi" },
};

/** Every article, by subject: the brewing guides first, then beans and roasts, then the basics. */
export default async function InfoPage() {
  const articles = await getArticles();
  const topics = ARTICLE_TOPICS.map((topic) => ({
    topic,
    articles: articles.filter((article) => article.topic === topic),
  })).filter((group) => group.articles.length > 0);

  return (
    <PageShell>
      <PageHeading title={t.info.title} lead={t.info.lead} />
      <QuizBand
        id="kahve-testi"
        title={t.home.quizTitle}
        lead={t.home.quizLead}
        action={t.home.quizCta}
        className="mb-12 md:mb-16"
      />
      {topics.map(({ topic, articles: group }, index) => (
        <Section key={topic} id={topic} className={index === 0 ? "mt-0 md:mt-0" : undefined}>
          <SectionHeading id={topic} title={t.info.topics[topic]} />
          <ul aria-labelledby={topic} className="grid stagger gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.map((article) => (
              <li key={article.slug}>
                <InfoCard article={article} heading="h3" />
              </li>
            ))}
          </ul>
        </Section>
      ))}
    </PageShell>
  );
}
