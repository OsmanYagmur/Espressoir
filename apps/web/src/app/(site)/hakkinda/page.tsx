import type { Metadata } from "next";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { getArchive } from "@/lib/data/archive";
import { methodCounts } from "@/lib/data/selectors";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.about.title,
  description: t.about.description,
  alternates: { canonical: "/hakkinda" },
};

function Prose({ paragraphs }: { paragraphs: readonly string[] }) {
  return (
    <div className="max-w-[62ch] space-y-4 border-b border-border py-5 leading-relaxed">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

export default async function AboutPage() {
  const methods = methodCounts(await getArchive());

  return (
    <PageShell>
      <PageHeading title={t.about.title} />
      <div className="grid md:grid-cols-[minmax(0,1fr)_340px]">
        <div className="md:border-r md:border-rule md:pr-6">
          <SectionHeading index={1} title={t.about.whatTitle} />
          <Prose paragraphs={t.about.what} />
          <SectionHeading index={2} title={t.about.scoringTitle} />
          <Prose paragraphs={t.about.scoring} />
          <SectionHeading index={3} title={t.about.notesTitle} />
          <Prose paragraphs={t.about.notes} />
          <SectionHeading index={4} title={t.about.nextTitle} />
          <Prose paragraphs={t.about.next} />
        </div>
        <aside className="md:pl-6">
          <SectionHeading index={5} title={t.about.methodsTitle} />
          <ul className="font-mono text-[0.8rem]">
            {methods.map(({ method }) => (
              <li
                key={method.slug}
                className="flex items-baseline justify-between gap-3 border-b border-border py-2"
              >
                <span>{method.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t.coffee.brewCategories[method.category]}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}
