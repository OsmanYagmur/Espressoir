import { googleCalendarUrl, type CalendarEvent } from "@espressoir/core";
import { CalendarPlusIcon } from "lucide-react";
import type { Route } from "next";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const link = "text-accent-ink underline underline-offset-3";

/**
 * "Takvime ekle" (the .ics file: iPhone, Mac, Outlook) and "Google Takvim" (Android's
 * calendar opens no files). Plain links: they work without JavaScript.
 */
export function CalendarLinks({
  event,
  file,
  className,
}: {
  event: CalendarEvent;
  /** The address of the .ics file. */
  file: Route;
  className?: string;
}) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      <CalendarPlusIcon aria-hidden className="size-5 stroke-[1.5] text-ink-2" />
      <a href={file} className={link} download>
        {t.workshop.calendar}
      </a>
      <a href={googleCalendarUrl(event)} className={link} target="_blank" rel="noopener noreferrer">
        {t.workshop.calendarGoogle}
      </a>
    </p>
  );
}
