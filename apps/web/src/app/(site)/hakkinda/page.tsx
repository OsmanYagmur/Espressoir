import type { Metadata } from "next";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { Chip, Chips } from "@/components/ui/chip";
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
    <div className="flex flex-col gap-4">
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

export default async function AboutPage() {
  const methods = methodCounts(await getArchive());

  return (
    <PageShell width="read">
      <PageHeading title={t.about.title} lead={t.about.lead} />

      {/* The home page's "Nasıl çalışır?" link lands here. */}
      <Section id="nasil-calisir" className="mt-0 md:mt-0">
        <SectionHeading id="nasil-calisir" title={t.about.howTitle} />
        <ol className="flex flex-col gap-4">
          {t.about.how.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[auto_1fr] gap-x-4">
              <span className="type-figure text-ink-2">{index + 1}</span>
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="text-ink-2">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="bu-ne">
        <SectionHeading id="bu-ne" title={t.about.whatTitle} />
        <Prose paragraphs={t.about.what} />
      </Section>
      <Section id="puanlar">
        <SectionHeading id="puanlar" title={t.about.scoringTitle} />
        <Prose paragraphs={t.about.scoring} />
      </Section>
      <Section id="notlar">
        <SectionHeading id="notlar" title={t.about.notesTitle} />
        <Prose paragraphs={t.about.notes} />
      </Section>
      <Section id="sirada">
        <SectionHeading id="sirada" title={t.about.nextTitle} />
        <Prose paragraphs={t.about.next} />
      </Section>
      <Section id="yontemler">
        <SectionHeading id="yontemler" title={t.about.methodsTitle} />
        <Chips>
          {methods.map(({ method }) => (
            <Chip key={method.slug}>{method.name}</Chip>
          ))}
        </Chips>
      </Section>
    </PageShell>
  );
}
