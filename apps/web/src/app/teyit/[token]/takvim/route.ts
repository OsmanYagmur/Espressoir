import { icsCalendar } from "@espressoir/core";
import { readWorkshopRsvp } from "@espressoir/db";
import { connection } from "next/server";

import { createPublicClient } from "@/lib/supabase/public";
import { calendarResponse, workshopCalendarEvent } from "@/lib/workshop-calendar";

/**
 * GET /teyit/<token>/takvim: the workshop of an approved person as an .ics file, leading
 * back to their own answer page (so the entry is where they change their mind).
 */
export async function GET(request: Request, { params }: RouteContext<"/teyit/[token]/takvim">) {
  await connection();
  const { token } = await params;
  const rsvp = await readWorkshopRsvp(createPublicClient(), token);
  if (!rsvp || rsvp.status !== "approved") return new Response(null, { status: 404 });
  const url = new URL(`/teyit/${token}`, request.url).toString();
  const workshop = {
    title: rsvp.workshopTitle,
    startsAt: rsvp.startsAt,
    endsAt: rsvp.endsAt,
    locationText: rsvp.locationText,
  };
  return calendarResponse(
    icsCalendar(workshopCalendarEvent(workshop, url), new Date()),
    workshop.title,
  );
}
