import { slugify } from "@espressoir/core";
import { InfoIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { t } from "@/lib/i18n";

const legal = t.legal;

export type LegalKey = "kvkk" | "privacy" | "terms";

const LEGAL_ROUTES: Record<LegalKey, Route> = {
  kvkk: "/kvkk",
  privacy: "/gizlilik",
  terms: "/kosullar",
};

/**
 * One of the legal texts, in the reading column: the draft note, what the page holds (each
 * section linkable by its title), then the sections as plain paragraphs.
 */
export function LegalPage({ page }: { page: LegalKey }) {
  const { title, sections } = legal[page];
  const others = (Object.keys(LEGAL_ROUTES) as LegalKey[]).filter((key) => key !== page);

  return (
    <PageShell width="read">
      <PageHeading title={title} lead={legal.updated} size="title" />
      {/* The texts are drafts until the owner has had them reviewed. */}
      <p
        role="note"
        className="flex gap-3 rounded-md border border-line-strong bg-surface p-4 font-medium"
      >
        <InfoIcon aria-hidden className="mt-0.5 size-5 shrink-0 stroke-[1.5] text-accent-ink" />
        {legal.draftBanner}
      </p>
      <nav aria-labelledby="bu-sayfada" className="mt-8 rounded-lg bg-sunk p-4 md:p-6">
        <p id="bu-sayfada" className="type-label">
          {legal.contents}
        </p>
        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-6 marker:text-ink-2">
          {sections.map((section) => (
            <li key={section.title}>
              <a
                href={`#${slugify(section.title)}`}
                className="text-accent-ink underline underline-offset-3"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {/* Each section is linkable by its title: /gizlilik#cerezler. */}
      {sections.map((section) => (
        <Section key={section.title} id={slugify(section.title)} className="scroll-mt-6 md:mt-12">
          <SectionHeading level={3} title={section.title} id={slugify(section.title)} />
          <div className="flex flex-col gap-4">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.items.length > 0 ? (
              <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-ink-3">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </Section>
      ))}
      <nav aria-label={legal.related} className="mt-12 border-t border-line pt-6">
        <p className="type-label">{legal.related}</p>
        <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {others.map((key) => (
            <li key={key}>
              <Link
                href={LEGAL_ROUTES[key]}
                className="text-accent-ink underline underline-offset-3"
              >
                {legal[key].title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </PageShell>
  );
}
