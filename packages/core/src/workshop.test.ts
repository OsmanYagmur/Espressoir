import { describe, expect, it } from "vitest";

import {
  isWorkshopContact,
  isWorkshopPhone,
  summarizeApplications,
  whatsappNumber,
  type ApplicationFacts,
} from "./workshop";

describe("isWorkshopContact", () => {
  it("takes a phone number or an Instagram handle", () => {
    expect(isWorkshopContact("0555 123 45 67")).toBe(true);
    expect(isWorkshopContact("+90 (555) 123-45-67")).toBe(true);
    expect(isWorkshopContact("@kahve.sever_34")).toBe(true);
    expect(isWorkshopContact("kahvesever")).toBe(true);
  });

  it("refuses anything else", () => {
    expect(isWorkshopContact("12 34")).toBe(false);
    expect(isWorkshopContact("ada@example.com")).toBe(false);
    expect(isWorkshopContact("bir iki üç")).toBe(false);
    expect(isWorkshopContact("")).toBe(false);
  });
});

describe("isWorkshopPhone", () => {
  it("takes a Turkish number written any usual way, or a foreign one with its code", () => {
    for (const phone of [
      "0555 123 45 67",
      "555 123 45 67",
      "+90 (555) 123-45-67",
      "905551234567",
      "0212 345 67 89",
      "+44 20 7946 0958",
    ]) {
      expect(isWorkshopPhone(phone), phone).toBe(true);
      expect(isWorkshopContact(phone), phone).toBe(true);
    }
  });

  it("refuses handles, short or misdialled numbers", () => {
    for (const phone of [
      "@kahvesever",
      "kahvesever",
      "0555 123 45",
      "0655 123 45 67",
      "+1 23",
      "",
    ]) {
      expect(isWorkshopPhone(phone), phone).toBe(false);
    }
  });
});

describe("whatsappNumber", () => {
  it("writes a phone number the way wa.me wants it", () => {
    expect(whatsappNumber("0555 123 45 67")).toBe("905551234567");
    expect(whatsappNumber("555 123 45 67")).toBe("905551234567");
    expect(whatsappNumber("+90 (555) 123-45-67")).toBe("905551234567");
    expect(whatsappNumber("905551234567")).toBe("905551234567");
    expect(whatsappNumber("+44 20 7946 0958")).toBe("442079460958");
  });

  it("has nothing for a handle", () => {
    expect(whatsappNumber("@kahvesever")).toBeNull();
    expect(whatsappNumber("kahvesever")).toBeNull();
  });
});

describe("summarizeApplications", () => {
  const application = (fields: Partial<ApplicationFacts>): ApplicationFacts => ({
    status: "pending",
    experience: "new",
    source: "form",
    attended: null,
    createdAt: "2026-11-01T10:00:00Z",
    ...fields,
  });

  it("counts by status, experience and source, and fills against the capacity", () => {
    const summary = summarizeApplications(
      [
        application({ status: "approved", experience: "regular" }),
        application({ status: "approved", source: "admin" }),
        application({ status: "waitlist", experience: "home_brewer" }),
        application({ status: "rejected" }),
      ],
      8,
      "Europe/Istanbul",
    );
    expect(summary.total).toBe(4);
    expect(summary.byStatus).toEqual({ pending: 0, approved: 2, rejected: 1, waitlist: 1 });
    expect(summary.byExperience).toEqual({ new: 2, regular: 1, home_brewer: 1 });
    expect(summary.bySource).toEqual({ form: 3, admin: 1 });
    expect(summary.fill).toBe(0.25);
  });

  it("asks who came of the approved only, and has no rate until someone is marked", () => {
    const unmarked = summarizeApplications([application({ status: "approved" })], 8, "UTC");
    expect(unmarked.attendance).toEqual({ came: 0, missed: 0, unmarked: 1 });
    expect(unmarked.showRate).toBeNull();

    const marked = summarizeApplications(
      [
        application({ status: "approved", attended: true }),
        application({ status: "approved", attended: true }),
        application({ status: "approved", attended: false }),
        application({ status: "rejected", attended: true }),
      ],
      8,
      "UTC",
    );
    expect(marked.attendance).toEqual({ came: 2, missed: 1, unmarked: 0 });
    expect(marked.showRate).toBeCloseTo(2 / 3);
  });

  it("counts per day in the site's time zone", () => {
    const summary = summarizeApplications(
      [
        // 23:30 in Istanbul on 1 November, still 20:30 UTC.
        application({ createdAt: "2026-11-01T20:30:00Z" }),
        // 00:30 in Istanbul on 2 November, 21:30 UTC on the 1st.
        application({ createdAt: "2026-11-01T21:30:00Z" }),
        application({ createdAt: "2026-10-30T09:00:00Z" }),
      ],
      8,
      "Europe/Istanbul",
    );
    expect(summary.perDay).toEqual([
      { day: "2026-10-30", count: 1 },
      { day: "2026-11-01", count: 1 },
      { day: "2026-11-02", count: 1 },
    ]);
  });
});
