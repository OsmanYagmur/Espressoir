import { readWorkshopRsvp, WORKSHOP_RSVP_ERRORS, type WorkshopRsvp } from "@espressoir/db";
import { CheckIcon, XIcon } from "lucide-react";
import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarLinks } from "@/components/workshop/calendar-links";
import { format, t } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";
import { createPublicClient } from "@/lib/supabase/public";
import { workshopCalendarEvent } from "@/lib/workshop-calendar";
import { workshopWhen } from "@/lib/workshop-format";

import { answerRsvp } from "./actions";

const r = t.workshop.rsvp;

export const metadata: Metadata = {
  title: r.title,
  // A personal page: never listed, never followed.
  robots: { index: false, follow: false },
};

type Props = PageProps<"/teyit/[token]">;

/**
 * A person's answer page, reached from the link the owner sends over WhatsApp: the
 * workshop, their first name and two buttons. Read per request (the answer changes), with
 * the public key; the database shows a token's first name and workshop and nothing more.
 */
export default function RsvpPage({ params, searchParams }: Props) {
  return (
    <PageShell width="read">
      <Suspense fallback={<PageSkeleton />}>
        <Rsvp params={params} searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

function Status({ rsvp }: { rsvp: WorkshopRsvp }) {
  if (rsvp.status === "rejected") return <p>{r.rejected}</p>;
  if (rsvp.status !== "approved") return <p>{r.notApproved}</p>;
  if (rsvp.rsvp === null) return rsvp.canAnswer ? null : <p>{r.closed}</p>;
  const yes = rsvp.rsvp === "yes";
  return (
    <p
      role="status"
      className={
        yes ? "rounded-md bg-sage-soft p-4 font-medium text-sage-ink" : "rounded-md bg-sunk p-4"
      }
    >
      {yes ? r.answeredYes : r.answeredNo}
      {rsvp.canAnswer ? null : ` ${r.closed}`}
    </p>
  );
}

async function Rsvp({ params, searchParams }: Pick<Props, "params" | "searchParams">) {
  const { token } = await params;
  const rsvp = await readWorkshopRsvp(createPublicClient(), token);
  if (!rsvp) notFound();
  const { hata } = await searchParams;
  const error = WORKSHOP_RSVP_ERRORS.find((code) => code === hata) ?? (hata ? "failed" : null);
  const when = workshopWhen(rsvp);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex stagger flex-col gap-3">
        <h1 className="type-display">{rsvp.workshopTitle}</h1>
        <p className="type-lead">
          {when.full}
          {rsvp.locationText ? ` · ${rsvp.locationText}` : null}
        </p>
      </header>

      <Card className="flex flex-col gap-4">
        <p className="type-card-title">{format(r.greeting, { name: rsvp.firstName })}</p>
        {error ? (
          <p role="alert" className="font-medium text-danger">
            {r.errors[error]}
          </p>
        ) : null}
        <Status rsvp={rsvp} />
        {rsvp.status === "approved" && rsvp.rsvp === "yes" && rsvp.canAnswer ? (
          <CalendarLinks
            event={workshopCalendarEvent(
              {
                title: rsvp.workshopTitle,
                startsAt: rsvp.startsAt,
                endsAt: rsvp.endsAt,
                locationText: rsvp.locationText,
              },
              `${getSiteUrl().origin}/teyit/${token}`,
            )}
            file={`/teyit/${token}/takvim` as Route}
          />
        ) : null}
        {rsvp.canAnswer ? (
          <form action={answerRsvp} className="flex flex-col gap-4">
            <input type="hidden" name="token" value={token} />
            <p>{rsvp.rsvp === null ? r.question : r.change}</p>
            <div className="flex flex-wrap gap-3">
              {/* The answer not given yet is the main action; both stay one click away. */}
              <Button
                type="submit"
                name="answer"
                value="yes"
                variant={rsvp.rsvp === "yes" ? "secondary" : "primary"}
                aria-pressed={rsvp.rsvp === "yes"}
              >
                <CheckIcon aria-hidden />
                {r.yes}
              </Button>
              <Button
                type="submit"
                name="answer"
                value="no"
                variant="secondary"
                aria-pressed={rsvp.rsvp === "no"}
              >
                <XIcon aria-hidden />
                {r.no}
              </Button>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
