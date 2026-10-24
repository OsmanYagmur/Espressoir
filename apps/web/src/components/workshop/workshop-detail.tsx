import type { Workshop } from "@espressoir/db";
import { ChevronDownIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { PhotoFigure } from "@/components/site/photo";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { programOf } from "@/content/atolye";
import { format, t } from "@/lib/i18n";
import { workshopWhen } from "@/lib/workshop-format";

import { ApplyForm } from "./apply-form";
import { Capacity, DateTile, EventCard } from "./event-card";

const w = t.workshop;
const FORM = "#basvuru" as Route;

/** The way to the form: the primary action, or what stops it once the seats are gone. */
function ApplyButton({ full, className }: { full: boolean; className?: string }) {
  if (full) {
    return (
      <Button block disabled className={className}>
        {w.full}
      </Button>
    );
  }
  return (
    <Button asChild block className={className}>
      <Link href={FORM}>{w.apply}</Link>
    </Button>
  );
}

function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-ink-3">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

/**
 * A workshop's page (DESIGN.md → Atölye): the cover (the program's photo, or crema), the title
 * and its sentence; day, place and seats with the one "Başvur"; the program, what to bring,
 * the questions people ask; the form. On a phone "Başvur" stays at the bottom of the
 * screen until the form comes into view.
 */
export function WorkshopDetail({
  workshop,
  others,
}: {
  workshop: Workshop;
  /** The other open workshops, listed at the end. */
  others: readonly Workshop[];
}) {
  const program = programOf(workshop.program);
  const when = workshopWhen(workshop);
  const full = workshop.seatsLeft === 0;
  const faq = [...(program?.faq ?? []), { question: w.priceQuestion, answer: workshop.priceText }];

  return (
    <>
      {/* Everything above the form; the phone's apply bar sticks to the bottom of this. */}
      <div>
        <header className="flex flex-col gap-3">
          {program?.photo ? (
            <PhotoFigure
              id={program.photo}
              priority
              sizes="(min-width: 672px) 640px, 100vw"
              className="mb-3"
            />
          ) : (
            <div aria-hidden className="mb-3 h-24 rounded-lg bg-crema md:h-40" />
          )}
          <div className="flex stagger flex-col gap-3">
            <h1 className="type-display">{workshop.title}</h1>
            {program ? <p className="max-w-read type-lead">{program.lead}</p> : null}
          </div>
        </header>

        <Card className="mt-6 grid grid-cols-[56px_1fr] gap-4">
          <DateTile workshop={workshop} />
          <div className="flex min-w-0 flex-col gap-3">
            <p className="font-semibold">{when.full}</p>
            <p className="type-meta">
              {workshop.locationText ? `${workshop.locationText} · ` : null}
              {w.location}
            </p>
            <p className="type-meta">
              {w.priceLabel}: {workshop.priceText}
            </p>
            <Capacity workshop={workshop} />
            <ApplyButton full={full} className="mt-2 max-md:hidden md:w-auto md:self-start" />
          </div>
        </Card>

        {program ? (
          <>
            <Section id="kimler-icin">
              <SectionHeading id="kimler-icin" title={w.audienceTitle} />
              <p>{program.audience}</p>
            </Section>

            <Section id="program">
              <SectionHeading id="program" title={w.programTitle} />
              <ol className="flex flex-col gap-4">
                {program.steps.map((step, index) => (
                  <li key={step.title} className="grid grid-cols-[32px_1fr] gap-x-3">
                    <span
                      aria-hidden
                      className="grid size-8 place-items-center rounded-full bg-sunk font-mono text-sm"
                    >
                      {index + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold">{step.title}</span>
                        <span className="type-figure text-ink-2">
                          {format(w.minutes, { minutes: step.minutes })}
                        </span>
                      </p>
                      <p className="text-ink-2">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>

            <div className="grid gap-x-8 md:grid-cols-2">
              <Section id="yaninda-getir">
                <SectionHeading id="yaninda-getir" title={w.bringTitle} level={3} />
                <List items={program.bring} />
              </Section>
              <Section id="biz-hazirliyoruz">
                <SectionHeading id="biz-hazirliyoruz" title={w.providedTitle} level={3} />
                <List items={program.provided} />
              </Section>
            </div>
          </>
        ) : null}

        {/* Each question opens its answer: the browser's own disclosure, so it works without
            JavaScript, with the keyboard and with a screen reader. */}
        <Section id="sss">
          <SectionHeading id="sss" title={w.faqTitle} />
          <ul className="border-y border-line">
            {faq.map((item) => (
              <li key={item.question} className="border-line not-first:border-t">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 font-semibold transition-colors hover:text-ink-2 [&::-webkit-details-marker]:hidden">
                    {item.question}
                    <ChevronDownIcon
                      aria-hidden
                      className="size-5 flex-none text-ink-2 transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="pb-4 text-ink-2">{item.answer}</p>
                </details>
              </li>
            ))}
          </ul>
        </Section>

        <div className="sticky bottom-0 z-10 -mx-4 mt-12 border-t border-line bg-surface px-4 pt-3 pb-[calc(var(--space-3)+env(safe-area-inset-bottom))] shadow-sticky md:hidden">
          <ApplyButton full={full} />
        </div>
      </div>

      <Section id="basvuru" className="scroll-mt-4">
        <SectionHeading id="basvuru" title={w.formTitle} hint={full ? undefined : w.formLead} />
        {full ? <p className="mb-6 rounded-md bg-sunk p-4 font-medium">{w.fullNotice}</p> : null}
        <Card>
          <ApplyForm workshopId={workshop.id} full={full} />
        </Card>
      </Section>

      {others.length > 0 ? (
        <Section id="diger-atolyeler">
          <SectionHeading id="diger-atolyeler" title={w.otherTitle} />
          <div className="flex flex-col gap-4">
            {others.map((other) => (
              <EventCard
                key={other.id}
                workshop={other}
                action="details"
                href={`/workshop/${other.id}` as Route}
              />
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
}
