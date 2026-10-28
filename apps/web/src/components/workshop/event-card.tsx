import type { Workshop } from "@espressoir/db";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { seatsText, workshopWhen } from "@/lib/workshop-format";

/** The date tile: the month over the day, on crema. */
export function DateTile({ workshop }: { workshop: Pick<Workshop, "startsAt" | "endsAt"> }) {
  const when = workshopWhen(workshop);
  return (
    <span
      aria-hidden
      className="flex h-16 w-14 flex-col items-center justify-center rounded-md bg-crema text-on-crema"
    >
      <span className="text-sm font-semibold">{when.month}</span>
      <span className="text-3xl font-semibold tabular-nums">{when.day}</span>
    </span>
  );
}

/** How full the workshop is: a sage bar and "8 kişilik · 3 yer kaldı". */
export function Capacity({ workshop }: { workshop: Pick<Workshop, "capacity" | "seatsLeft"> }) {
  const taken = workshop.capacity - workshop.seatsLeft;
  return (
    <div className="flex flex-col gap-1">
      <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-sunk">
        <span
          className="block h-full origin-left rounded-full bg-sage motion-safe:animate-fill motion-safe:animate-delay-150"
          style={{ width: `${(taken / workshop.capacity) * 100}%` }}
        />
      </span>
      <span className="type-meta">{seatsText(workshop)}</span>
    </div>
  );
}

/**
 * EventCard (DESIGN.md): date tile, day, hours and how long, title, where (the district;
 * the address comes with the approval), the price as the admin wrote it, how full, and one
 * button. On a wide screen the seats and the button stand apart on the right. On the
 * workshop's own page the button is the primary "Başvur" (to the form); elsewhere it is the
 * secondary "Detaylar". Once the seats are gone it says so, disabled.
 */
export function EventCard({
  workshop,
  action,
  href,
  heading: Heading = "h3",
  className,
}: {
  workshop: Workshop;
  action: "apply" | "details";
  href: Route;
  heading?: "h2" | "h3";
  className?: string;
}) {
  const when = workshopWhen(workshop);
  const full = workshop.seatsLeft === 0;
  return (
    <article
      className={cn(
        cardClass,
        "grid grid-cols-[56px_1fr] gap-4 md:grid-cols-[56px_minmax(0,1fr)_minmax(0,16rem)] md:gap-x-6",
        className,
      )}
    >
      <DateTile workshop={workshop} />
      <div className="flex min-w-0 flex-col gap-2">
        <p className="type-meta">
          {when.full} · {when.duration}
        </p>
        <Heading className="type-card-title">{workshop.title}</Heading>
        <p className="type-meta">
          {workshop.locationText ? `${workshop.locationText} · ` : null}
          {t.workshop.location}
        </p>
        <p className="type-meta">
          {t.workshop.priceLabel}: {workshop.priceText}
        </p>
      </div>
      <div className="col-start-2 flex flex-col gap-3 md:col-start-3 md:justify-center">
        <Capacity workshop={workshop} />
        {full ? (
          <Button
            variant={action === "apply" ? "primary" : "secondary"}
            disabled
            className="self-start"
          >
            {t.workshop.full}
          </Button>
        ) : (
          <Button
            asChild
            variant={action === "apply" ? "primary" : "secondary"}
            className="self-start"
          >
            <Link href={href} prefetch={false}>
              {action === "apply" ? t.workshop.apply : t.workshop.details}
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
