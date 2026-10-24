import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { InfoCard } from "@/components/info/info-card";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { PhotoFigure } from "@/components/site/photo";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { getArticle, getArticles } from "@/lib/data/articles";
import { format, t } from "@/lib/i18n";

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
  const index = articles.findIndex((article) => article.slug === slug);
  const article = articles[index];
  if (!article) notFound();
  // The next ones in the list, wrapping round to the start.
  const others = Array.from(
    { length: Math.min(OTHERS, articles.length - 1) },
    (_, step) => articles[(index + step + 1) % articles.length]!,
  );

  return (
    <article>
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
      </PageHeading>
      {article.photo ? (
        <PhotoFigure
          id={article.photo}
          priority
          sizes="(min-width: 672px) 640px, 100vw"
          className="mb-8"
        />
      ) : null}
      <div className="flex flex-col gap-4">
        {article.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
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
