import { slugify } from "@espressoir/core";
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

/** One of the legal texts, in the reading column: sections of plain paragraphs. */
export function LegalPage({ page }: { page: LegalKey }) {
  const { title, sections } = legal[page];
  const others = (Object.keys(LEGAL_ROUTES) as LegalKey[]).filter((key) => key !== page);

  return (
    <PageShell width="read">
      <PageHeading title={title} lead={legal.updated} size="title" />
      {/* The texts are drafts until the owner has had them reviewed. */}
      <p role="note" className="rounded-md bg-sunk p-4">
        {legal.draftBanner}
      </p>
      {/* Each section is linkable by its title: /gizlilik#cerezler. */}
      {sections.map((section) => (
        <Section key={section.title} id={slugify(section.title)} className="md:mt-12">
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
