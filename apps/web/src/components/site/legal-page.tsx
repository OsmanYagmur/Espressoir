import type { Route } from "next";
import Link from "next/link";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { SectionHeading } from "@/components/site/section-heading";
import { t } from "@/lib/i18n";

const legal = t.legal;

export type LegalKey = "kvkk" | "privacy" | "terms";

export const LEGAL_ROUTES: Record<LegalKey, Route> = {
  kvkk: "/kvkk",
  privacy: "/gizlilik",
  terms: "/kosullar",
};

/** One of the legal texts, set like the other pages: numbered sections, plain paragraphs. */
export function LegalPage({ page }: { page: LegalKey }) {
  const { title, sections } = legal[page];
  const others = (Object.keys(LEGAL_ROUTES) as LegalKey[]).filter((key) => key !== page);

  return (
    <PageShell>
      <PageHeading fit title={title} aside={<p>{legal.updated}</p>} />
      {/* The texts are drafts until the owner has had them reviewed. */}
      <p
        role="note"
        className="mt-6 max-w-[62ch] border-2 border-brand px-4 py-3 font-mono text-sm leading-relaxed"
      >
        {legal.draftBanner}
      </p>
      <div className="max-w-3xl">
        {sections.map((section, index) => (
          <section key={section.title} aria-labelledby={`bolum-${index + 1}`}>
            <SectionHeading index={index + 1} title={section.title} id={`bolum-${index + 1}`} />
            <div className="max-w-[62ch] space-y-4 border-b border-border py-5 leading-relaxed">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items.length > 0 ? (
                <ul className="list-disc space-y-2 pl-5 marker:text-muted-foreground">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ))}
        <nav aria-label={legal.related} className="py-6 font-mono text-xs">
          <span className="label-caps text-muted-foreground">{legal.related}</span>
          <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            {others.map((key) => (
              <li key={key}>
                <Link
                  href={LEGAL_ROUTES[key]}
                  className="underline underline-offset-4 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {legal[key].title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </PageShell>
  );
}
