/**
 * A workshop as a calendar entry: an .ics file (iPhone, Mac, Outlook open it with their
 * calendar) and a Google Calendar link (Android's calendar does not open .ics files).
 * Times are written in UTC, so every calendar shows the workshop at the local hour of the
 * reader's own time zone.
 */

export interface CalendarEvent {
  /** Stable across downloads, so a second download updates the entry instead of adding one. */
  uid: string;
  title: string;
  /** ISO timestamps. */
  start: string;
  end: string;
  location: string | null;
  description: string;
  url: string;
}

/** "20261122T110000Z" */
function utcStamp(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Text values escape backslashes, separators and line breaks (RFC 5545 §3.3.11). */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Bytes a character takes in UTF-8 (counted by hand: the app's runtime has no TextEncoder). */
function utf8Length(char: string): number {
  const code = char.codePointAt(0)!;
  return code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
}

/** Lines longer than 75 bytes go on in the next line after a space, never mid-letter. */
function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = utf8Length(char);
    // Continuation lines start with a space, which counts towards their 75.
    if (bytes + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** The .ics file for one event; `now` is when it was written (DTSTAMP). */
export function icsCalendar(event: CalendarEvent, now: Date): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Espressoir//Atolye//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${utcStamp(now.toISOString())}`,
    `DTSTART:${utcStamp(event.start)}`,
    `DTEND:${utcStamp(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `DESCRIPTION:${escapeText(`${event.description}\n${event.url}`)}`,
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

/** The same event as a link that opens Google Calendar's "new event" page, filled in. */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params: [string, string][] = [
    ["action", "TEMPLATE"],
    ["text", event.title],
    ["dates", `${utcStamp(event.start)}/${utcStamp(event.end)}`],
    ["details", `${event.description}\n${event.url}`],
    ...(event.location ? [["location", event.location] as [string, string]] : []),
  ];
  const query = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
  return `https://calendar.google.com/calendar/render?${query}`;
}
