import { icsCalendar } from "@espressoir/core";
import { connection } from "next/server";

import { getOpenWorkshops } from "@/lib/data/workshops";
import { getSiteUrl } from "@/lib/site-url";
import { calendarResponse, workshopCalendarEvent } from "@/lib/workshop-calendar";

/**
 * GET /workshop/<id>/takvim: the workshop as an .ics file ("Takvime ekle"). Written per
 * request from the cached read of the workshops, so a changed date is in the next file.
 */
export async function GET(_request: Request, { params }: RouteContext<"/workshop/[id]/takvim">) {
  await connection();
  const { id } = await params;
  const workshop = (await getOpenWorkshops()).find((candidate) => candidate.id === id);
  if (!workshop) return new Response(null, { status: 404 });
  const url = new URL(`/workshop/${workshop.id}`, getSiteUrl()).toString();
  return calendarResponse(
    icsCalendar(workshopCalendarEvent(workshop, url), new Date()),
    workshop.title,
  );
}
