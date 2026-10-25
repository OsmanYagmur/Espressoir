import { slugify, type CalendarEvent } from "@espressoir/core";
import type { Workshop } from "@espressoir/db";

import { t } from "@/lib/i18n";

/**
 * A workshop as a calendar entry ("Takvime ekle"). The id is made of the start and the
 * title, so the file from the workshop's page and the one from a person's answer page
 * update the same entry instead of adding a second one. `url` is the page it leads back to.
 */
export function workshopCalendarEvent(
  workshop: Pick<Workshop, "title" | "startsAt" | "endsAt" | "locationText">,
  url: string,
): CalendarEvent {
  const start = workshop.startsAt.replace(/\D/g, "").slice(0, 12);
  return {
    uid: `${start}-${slugify(workshop.title)}@espressoir.com`,
    title: workshop.title,
    start: workshop.startsAt,
    end: workshop.endsAt,
    location: workshop.locationText,
    description: t.workshop.calendarNote,
    url,
  };
}

/** The .ics response: downloaded as a file the phone's or computer's calendar opens. */
export function calendarResponse(ics: string, title: string): Response {
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(title) || "atolye"}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
