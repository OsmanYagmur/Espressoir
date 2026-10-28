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

/**
 * Why Espressoir exists (the list it grew from), what it is for, how it works (the same
 * three steps as the home page, then what a score and a note mean), what comes next, and
 * the brewing methods in the archive. In the owner's own voice.
 */
export default async function AboutPage() {
  const methods = methodCounts(await getArchive());

  return (
    <PageShell width="read">
      <PageHeading title={t.about.title} lead={t.about.lead} />

      <Section id="neden" className="mt-0 md:mt-0">
        <SectionHeading id="neden" title={t.about.whyTitle} />
        <Prose paragraphs={t.about.why} />
      </Section>
      <Section id="ne-ise-yarar">
        <SectionHeading id="ne-ise-yarar" title={t.about.problemTitle} />
        <Prose paragraphs={t.about.problem} />
      </Section>

      <Section id="nasil-calisir">
        <SectionHeading id="nasil-calisir" title={t.about.howTitle} />
        <ol className="flex flex-col gap-4">
          {t.home.how.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[auto_1fr] gap-x-4">
              <span
                aria-hidden
                className="grid size-8 place-items-center rounded-full bg-sage-soft text-sm font-semibold text-sage-ink tabular-nums"
              >
                {index + 1}
              </span>
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="text-ink-2">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <h3 className="mt-10 mb-3 type-card-title">{t.about.scoringTitle}</h3>
        <Prose paragraphs={t.about.scoring} />
        <h3 className="mt-10 mb-3 type-card-title">{t.about.notesTitle}</h3>
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
            <Chip key={method.slug} variant="method">
              {method.name}
            </Chip>
          ))}
        </Chips>
      </Section>
    </PageShell>
  );
}
