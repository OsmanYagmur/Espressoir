import { siteConfig } from "@espressoir/core";
import type { Workshop } from "@espressoir/db";

import { format, t } from "@/lib/i18n";

// A workshop happens at a place: its times are the site's wall clock, wherever the reader is.
const zone = { timeZone: siteConfig.timeZone } as const;
const monthFormat = new Intl.DateTimeFormat(siteConfig.locale, { month: "short", ...zone });
const dayFormat = new Intl.DateTimeFormat(siteConfig.locale, { day: "numeric", ...zone });
const dateFormat = new Intl.DateTimeFormat(siteConfig.locale, {
  day: "numeric",
  month: "long",
  weekday: "long",
  ...zone,
});
const timeFormat = new Intl.DateTimeFormat(siteConfig.locale, {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  ...zone,
});

export interface WorkshopWhen {
  /** The date tile: "Kas" over "22". */
  month: string;
  day: string;
  /** "22 Kasım Pazar" */
  date: string;
  /** "22 Kasım Pazar · 14:00–16:30" */
  full: string;
  /** "14:00" */
  start: string;
  /** How long, from the start and end the admin set: "2,5 saat", "90 dk". */
  duration: string;
}

/** "2 saat", "2,5 saat" for whole and half hours, minutes otherwise ("100 dk"). */
function durationText(minutes: number): string {
  if (minutes >= 60 && minutes % 30 === 0) {
    const hours = minutes / 60;
    return format(t.workshop.hours, { hours: String(hours).replace(".", ",") });
  }
  return format(t.workshop.minutes, { minutes });
}

export function workshopWhen(workshop: Pick<Workshop, "startsAt" | "endsAt">): WorkshopWhen {
  const start = new Date(workshop.startsAt);
  const date = dateFormat.format(start);
  const time = timeFormat.format(start);
  return {
    month: monthFormat.format(start),
    day: dayFormat.format(start),
    date,
    full: format(t.workshop.when, {
      date,
      start: time,
      end: timeFormat.format(new Date(workshop.endsAt)),
    }),
    start: time,
    duration: durationText(
      Math.round((new Date(workshop.endsAt).getTime() - start.getTime()) / 60_000),
    ),
  };
}

/** "8 kişilik · 3 yer kaldı" */
export function seatsText(workshop: Pick<Workshop, "capacity" | "seatsLeft">): string {
  return workshop.seatsLeft > 0
    ? format(t.workshop.seats, { capacity: workshop.capacity, left: workshop.seatsLeft })
    : format(t.workshop.seatsFull, { capacity: workshop.capacity });
}

/** The day and times as the admin form shows them: "2026-11-22", "14:00", "16:30". */
export function workshopFormValues(workshop: Pick<Workshop, "startsAt" | "endsAt">) {
  const day = new Intl.DateTimeFormat("en-CA", zone).format(new Date(workshop.startsAt));
  return {
    day,
    startTime: timeFormat.format(new Date(workshop.startsAt)),
    endTime: timeFormat.format(new Date(workshop.endsAt)),
  };
}
