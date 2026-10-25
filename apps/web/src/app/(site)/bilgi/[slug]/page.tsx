import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ArticleBody } from "@/components/info/article-body";
import { BrewAssistant } from "@/components/info/brew-assistant";
import { InfoCard } from "@/components/info/info-card";
import { RecipeCard } from "@/components/info/recipe-card";
import { JsonLd } from "@/components/site/json-ld";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PhotoFigure } from "@/components/site/photo";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { ShareButton } from "@/components/site/share-button";
import { getArticle, getArticles } from "@/lib/data/articles";
import { format, t } from "@/lib/i18n";
import { article as articleData, breadcrumbs } from "@/lib/structured-data";

type Props = PageProps<"/bilgi/[slug]">;

/** How many other articles follow one. */
const OTHERS = 2;

export async function generateStaticParams() {
  return (await getArticles()).map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/bilgi/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.summary,
      url: `/bilgi/${article.slug}`,
    },
  };
}

export default function ArticlePage({ params }: Props) {
  return (
    <PageShell width="read">
      <Suspense fallback={<PageSkeleton />}>
        <Article params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Article({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const articles = await getArticles();
  const article = articles.find((candidate) => candidate.slug === slug);
  if (!article) notFound();
  // The next ones on the same subject, wrapping round to its first; then the rest.
  const sameTopic = articles.filter((candidate) => candidate.topic === article.topic);
  const index = sameTopic.indexOf(article);
  const others = [
    ...sameTopic.slice(index + 1),
    ...sameTopic.slice(0, index),
    ...articles.filter((candidate) => candidate.topic !== article.topic),
  ].slice(0, OTHERS);

  return (
    <article>
      <JsonLd
        data={[
          articleData(article),
          breadcrumbs([
            { name: t.info.title, path: "/bilgi" },
            { name: article.title, path: `/bilgi/${article.slug}` },
          ]),
        ]}
      />
      <PageHeading
        size="title"
        kicker={
          <Link href="/bilgi" className="text-accent-ink underline underline-offset-3">
            {t.info.back}
          </Link>
        }
        title={article.title}
        lead={article.summary}
      >
        {article.readingMinutes ? (
          <p className="type-meta">
            {format(t.info.readingTime, { minutes: article.readingMinutes })}
          </p>
        ) : null}
        <ShareButton title={article.title} text={article.summary} />
      </PageHeading>
      {article.photo ? (
        <PhotoFigure
          id={article.photo}
          priority
          sizes="(min-width: 672px) 640px, 100vw"
          className="mb-8"
        />
      ) : null}
      {article.recipe ? <RecipeCard recipe={article.recipe} /> : null}
      {article.brewPlan ? <BrewAssistant plan={article.brewPlan} /> : null}
      <ArticleBody blocks={article.blocks} />
      {others.length > 0 ? (
        <Section id="diger-yazilar">
          <SectionHeading id="diger-yazilar" title={t.info.otherTitle} />
          <ul className="grid stagger gap-4">
            {others.map((other) => (
              <li key={other.slug}>
                <InfoCard article={other} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </article>
  );
}
