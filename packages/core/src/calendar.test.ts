import { describe, expect, it } from "vitest";

import { googleCalendarUrl, icsCalendar, type CalendarEvent } from "./calendar";

const event: CalendarEvent = {
  uid: "w1@espressoir.com",
  title: "Kahve 101",
  start: "2026-11-22T14:00:00+03:00",
  end: "2026-11-22T16:30:00+03:00",
  location: "Kadıköy, İstanbul",
  description: "Kahveye giriş; iki saatte üç demleme yöntemi.",
  url: "https://espressoir.com/workshop/w1",
};

describe("icsCalendar", () => {
  const ics = icsCalendar(event, new Date("2026-10-24T09:00:00Z"));

  it("writes the event in UTC, with CRLF line ends", () => {
    expect(ics).toContain("DTSTART:20261122T110000Z\r\n");
    expect(ics).toContain("DTEND:20261122T133000Z\r\n");
    expect(ics).toContain("DTSTAMP:20261024T090000Z\r\n");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("escapes separators and line breaks in text", () => {
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("LOCATION:Kadıköy\\, İstanbul");
    expect(unfolded).toContain("Kahveye giriş\\; iki saatte");
    expect(unfolded).toContain("yöntemi.\\nhttps://espressoir.com/workshop/w1");
  });

  it("folds lines over 75 bytes without splitting a letter", () => {
    const long = icsCalendar({ ...event, title: "ğ".repeat(60) }, new Date());
    const lines = long.split("\r\n");
    for (const line of lines) {
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    }
    const summary = lines.findIndex((line) => line.startsWith("SUMMARY:"));
    const unfolded = [lines[summary], lines[summary + 1]!.slice(1)].join("");
    expect(unfolded).toBe(`SUMMARY:${"ğ".repeat(60)}`);
  });
});

describe("googleCalendarUrl", () => {
  it("fills Google's new-event page", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.origin).toBe("https://calendar.google.com");
    expect(url.searchParams.get("dates")).toBe("20261122T110000Z/20261122T133000Z");
    expect(url.searchParams.get("text")).toBe("Kahve 101");
    expect(url.searchParams.get("location")).toBe("Kadıköy, İstanbul");
  });
});
