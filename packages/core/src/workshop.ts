/**
 * Workshops and the applications to them. The database enforces every one of these (a
 * database test compares the lists with its checks); they are shared so the form can
 * answer before a round trip.
 */

/** How the applicant gets on with coffee: the form's three option cards. */
export const WORKSHOP_EXPERIENCES = ["new", "regular", "home_brewer"] as const;
export type WorkshopExperience = (typeof WORKSHOP_EXPERIENCES)[number];

/** pending → approved / rejected; waitlist when the seats had run out. */
export const WORKSHOP_STATUSES = ["pending", "approved", "rejected", "waitlist"] as const;
export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number];

/** form: sent from the workshop page; admin: added from the admin panel. */
export const WORKSHOP_APPLICATION_SOURCES = ["form", "admin"] as const;
export type WorkshopApplicationSource = (typeof WORKSHOP_APPLICATION_SOURCES)[number];

export const WORKSHOP_NAME_MIN_LENGTH = 2;
export const WORKSHOP_NAME_MAX_LENGTH = 80;
export const WORKSHOP_CONTACT_MIN_LENGTH = 3;
export const WORKSHOP_CONTACT_MAX_LENGTH = 80;
export const WORKSHOP_QUESTION_MAX_LENGTH = 1000;
export const WORKSHOP_TITLE_MAX_LENGTH = 120;
export const WORKSHOP_PRICE_MAX_LENGTH = 120;
export const WORKSHOP_LOCATION_MAX_LENGTH = 120;
export const WORKSHOP_CAPACITY_MAX = 200;

/**
 * A phone number (digits, spaces, "+", "(", ")", "-", at least seven digits) or an
 * Instagram handle ("@" optional; letters, digits, "." and "_", up to 30).
 */
export const WORKSHOP_CONTACT_PATTERN = /^(?:\+?[\d\s()-]*\d[\d\s()-]*|@?[A-Za-z0-9._]{1,30})$/;

export function isWorkshopContact(value: string): boolean {
  const contact = value.trim();
  if (!WORKSHOP_CONTACT_PATTERN.test(contact)) return false;
  return /[A-Za-z]/.test(contact) || contact.replace(/\D/g, "").length >= 7;
}

/**
 * What the application form takes (the admin panel still takes a handle too): a Turkish
 * number written any usual way ("0555 123 45 67", "555 123 45 67", "+90 555 123 45 67"),
 * or another country's with its "+" code. Every one of them is also a contact above.
 */
export function isWorkshopPhone(value: string): boolean {
  const phone = value.trim();
  if (!/^\+?[\d\s()-]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+") && !digits.startsWith("90")) {
    return digits.length >= 8 && digits.length <= 15;
  }
  // Ten digits once the country code or the leading zero is gone; area codes start 2–4,
  // mobile numbers 5.
  return /^[2-5]\d{9}$/.test(digits.replace(/^(?:90|0)/, ""));
}

/** What the admin's statistics need from an application. */
export interface ApplicationFacts {
  status: WorkshopStatus;
  experience: WorkshopExperience;
  source: WorkshopApplicationSource;
  /** true came, false did not, null not marked. */
  attended: boolean | null;
  createdAt: string;
}

export interface ApplicationSummary {
  total: number;
  byStatus: Record<WorkshopStatus, number>;
  byExperience: Record<WorkshopExperience, number>;
  bySource: Record<WorkshopApplicationSource, number>;
  attendance: { came: number; missed: number; unmarked: number };
  /** Approved applications against the capacity, 0–1 (above 1 when overbooked). */
  fill: number;
  /** Of those marked, how many came (0–1); null while nobody is marked. */
  showRate: number | null;
  /** Applications per day in the time zone given, oldest first; days without any left out. */
  perDay: { day: string; count: number }[];
}

const countBy = <K extends string>(keys: readonly K[], values: readonly K[]) =>
  Object.fromEntries(
    keys.map((key) => [key, values.filter((value) => value === key).length]),
  ) as Record<K, number>;

/** The numbers of one workshop's applications for the admin panel. */
export function summarizeApplications(
  applications: readonly ApplicationFacts[],
  capacity: number,
  timeZone: string,
): ApplicationSummary {
  const byStatus = countBy(
    WORKSHOP_STATUSES,
    applications.map(({ status }) => status),
  );
  // Who came is asked of the people who were approved; the others never had a seat.
  const approved = applications.filter(({ status }) => status === "approved");
  const came = approved.filter(({ attended }) => attended === true).length;
  const missed = approved.filter(({ attended }) => attended === false).length;
  const dayOf = new Intl.DateTimeFormat("en-CA", { timeZone });
  const perDay = new Map<string, number>();
  for (const { createdAt } of applications) {
    const day = dayOf.format(new Date(createdAt));
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  return {
    total: applications.length,
    byStatus,
    byExperience: countBy(
      WORKSHOP_EXPERIENCES,
      applications.map(({ experience }) => experience),
    ),
    bySource: countBy(
      WORKSHOP_APPLICATION_SOURCES,
      applications.map(({ source }) => source),
    ),
    attendance: { came, missed, unmarked: approved.length - came - missed },
    fill: capacity > 0 ? byStatus.approved / capacity : 0,
    showRate: came + missed > 0 ? came / (came + missed) : null,
    perDay: [...perDay]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count })),
  };
}
