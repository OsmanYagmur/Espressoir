import type { Metadata } from "next";

import { InfoCard } from "@/components/info/info-card";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { getArticles } from "@/lib/data/articles";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.info.title,
  description: t.info.description,
  alternates: { canonical: "/bilgi" },
};

export default async function InfoPage() {
  const articles = await getArticles();
  return (
    <PageShell>
      <PageHeading title={t.info.title} lead={t.info.lead} />
      <ul aria-label={t.info.listLabel} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <li key={article.slug}>
            <InfoCard article={article} heading="h2" />
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
