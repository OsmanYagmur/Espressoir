/**
 * Workshops as the apps read them (the `workshop_overview` view), the application form,
 * the admin's workshop form and the applications an admin reads. Framework-free.
 */
import {
  WORKSHOP_CAPACITY_MAX,
  WORKSHOP_CONTACT_MAX_LENGTH,
  WORKSHOP_CONTACT_MIN_LENGTH,
  WORKSHOP_EXPERIENCES,
  WORKSHOP_LOCATION_MAX_LENGTH,
  WORKSHOP_NAME_MAX_LENGTH,
  WORKSHOP_NAME_MIN_LENGTH,
  WORKSHOP_PRICE_MAX_LENGTH,
  WORKSHOP_QUESTION_MAX_LENGTH,
  WORKSHOP_STATUSES,
  WORKSHOP_TITLE_MAX_LENGTH,
  WORKSHOP_APPLICATION_SOURCES,
  COMMUNITY_METRICS,
  isWorkshopContact,
  isWorkshopPhone,
} from "@espressoir/core";
import { z } from "zod";

import { MISSING_RELATION } from "./archive";
import type { Database } from "./database.types";
import type { TypedSupabaseClient } from "./index";

export const workshopRowSchema = z
  .object({
    workshop_id: z.uuid(),
    title: z.string().min(1),
    program: z.string().min(1),
    starts_at: z.string(),
    ends_at: z.string(),
    capacity: z.number().int().positive(),
    price_text: z.string(),
    location_text: z.string().nullable(),
    is_open: z.boolean(),
    seats_left: z.number().int().nonnegative(),
  })
  .transform((row) => ({
    id: row.workshop_id,
    title: row.title,
    /** Which program text the page shows. */
    program: row.program,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    capacity: row.capacity,
    priceText: row.price_text,
    locationText: row.location_text,
    isOpen: row.is_open,
    seatsLeft: row.seats_left,
  }));

export type Workshop = z.infer<typeof workshopRowSchema>;

/**
 * Every workshop with its seats left, soonest first, as the caller may see them (all of
 * them: they are public). Empty while the database does not have them yet.
 */
export async function fetchWorkshopRows(client: TypedSupabaseClient): Promise<unknown[]> {
  const { data, error } = await client
    .from("workshop_overview")
    .select("*")
    .order("starts_at", { ascending: true });
  if (error && MISSING_RELATION.has(error.code ?? "")) return [];
  if (error) throw new Error(`Atölyeler okunamadı: ${error.message}`);
  return data ?? [];
}

/** What an admin sees of an application. */
export const workshopApplicationRowSchema = z
  .object({
    id: z.uuid(),
    workshop_id: z.uuid(),
    name: z.string(),
    contact: z.string(),
    experience: z.enum(WORKSHOP_EXPERIENCES),
    question: z.string().nullable(),
    status: z.enum(WORKSHOP_STATUSES),
    // Newer than the table: a database without them reads as the form's, unmarked.
    source: z.enum(WORKSHOP_APPLICATION_SOURCES).default("form"),
    attended: z.boolean().nullable().default(null),
    created_at: z.string(),
  })
  .transform((row) => ({
    id: row.id,
    workshopId: row.workshop_id,
    name: row.name,
    contact: row.contact,
    experience: row.experience,
    question: row.question,
    status: row.status,
    source: row.source,
    attended: row.attended,
    createdAt: row.created_at,
  }));

/** The columns an admin reads (the panel, the CSV download). */
export const WORKSHOP_APPLICATION_SELECT =
  "id, workshop_id, name, contact, experience, question, status, source, attended, created_at";

export type WorkshopApplication = z.infer<typeof workshopApplicationRowSchema>;

// ── the application form ────────────────────────────────────────────────────────────────

export const WORKSHOP_APPLICATION_ERRORS = [
  "nameRequired",
  "nameTooLong",
  "contactInvalid",
  "phoneInvalid",
  "experienceRequired",
  "questionTooLong",
  "consentRequired",
] as const;
export type WorkshopApplicationError = (typeof WORKSHOP_APPLICATION_ERRORS)[number];

const code = (error: WorkshopApplicationError) => ({ error });
const tidy = (value: string) => value.trim().replace(/\s+/g, " ");

/** How to reach the person: the form takes a phone number, the admin a handle as well. */
const contactField = (accepts: (value: string) => boolean, error: WorkshopApplicationError) =>
  z
    .string()
    .transform(tidy)
    .pipe(
      z
        .string()
        .min(WORKSHOP_CONTACT_MIN_LENGTH, code(error))
        .max(WORKSHOP_CONTACT_MAX_LENGTH, code(error))
        .refine(accepts, code(error)),
    );

export const workshopApplicationInputSchema = z.object({
  workshopId: z.uuid(),
  name: z
    .string()
    .transform(tidy)
    .pipe(
      z
        .string()
        .min(WORKSHOP_NAME_MIN_LENGTH, code("nameRequired"))
        .max(WORKSHOP_NAME_MAX_LENGTH, code("nameTooLong")),
    ),
  contact: contactField(isWorkshopPhone, "phoneInvalid"),
  experience: z.enum(WORKSHOP_EXPERIENCES, code("experienceRequired")),
  question: z
    .string()
    .trim()
    .max(WORKSHOP_QUESTION_MAX_LENGTH, code("questionTooLong"))
    .transform((value) => value || null),
  consent: z.literal(true, code("consentRequired")),
});

export type WorkshopApplicationInput = z.infer<typeof workshopApplicationInputSchema>;

type ApplicationInsert = Database["public"]["Tables"]["workshop_applications"]["Insert"];

/** The row an applicant may write: the form's fields and nothing else. */
export function toWorkshopApplicationInsert(input: WorkshopApplicationInput): ApplicationInsert {
  return {
    workshop_id: input.workshopId,
    name: input.name,
    contact: input.contact,
    experience: input.experience,
    question: input.question,
    consent: input.consent,
  };
}

/**
 * A person the admin adds from the panel: the form's fields and the status chosen; agreed
 * on the phone or in person, they may be reached by an Instagram handle too.
 */
export const adminApplicationInputSchema = workshopApplicationInputSchema.extend({
  contact: contactField(isWorkshopContact, "contactInvalid"),
  status: z.enum(WORKSHOP_STATUSES),
});
export type AdminApplicationInput = z.infer<typeof adminApplicationInputSchema>;

/** The row an admin writes; the database marks it as added from the panel. */
export function toAdminApplicationInsert(input: AdminApplicationInput): ApplicationInsert {
  return { ...toWorkshopApplicationInsert(input), status: input.status };
}

// ── the admin overview ──────────────────────────────────────────────────────────────────

export const communityStatSchema = z
  .object({
    metric: z.enum(COMMUNITY_METRICS),
    total: z.coerce.number(),
    last_week: z.coerce.number(),
  })
  .transform((row) => ({ metric: row.metric, total: row.total, lastWeek: row.last_week }));

export type CommunityStat = z.infer<typeof communityStatSchema>;

// ── the admin's workshop form ───────────────────────────────────────────────────────────

export const WORKSHOP_INPUT_ERRORS = [
  "titleRequired",
  "programRequired",
  "dateInvalid",
  "timeInvalid",
  "endBeforeStart",
  "capacityRange",
  "priceRequired",
  "textTooLong",
] as const;
export type WorkshopInputError = (typeof WORKSHOP_INPUT_ERRORS)[number];

const adminCode = (error: WorkshopInputError) => ({ error });
const requiredText = (max: number, error: WorkshopInputError) =>
  z
    .string()
    .transform(tidy)
    .pipe(z.string().min(1, adminCode(error)).max(max, adminCode("textTooLong")));

/**
 * The offset of `timeZone` from UTC at a moment, in minutes ("Europe/Istanbul" → 180).
 * Intl is plain JavaScript, so this stays usable in the app as well.
 */
function zoneOffset(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const local = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
  );
  return Math.round((local - at.getTime()) / 60_000);
}

/** A wall-clock day and time in `timeZone`, as an instant: ("2026-11-22", "14:00") → ISO. */
export function zonedTimeToIso(day: string, time: string, timeZone: string): string {
  const guess = new Date(`${day}T${time}:00Z`);
  return new Date(guess.getTime() - zoneOffset(timeZone, guess) * 60_000).toISOString();
}

/** @param timeZone the site's time zone: the day and times are read as its wall clock. */
export function workshopInputSchema(programs: readonly string[], timeZone: string) {
  return z
    .object({
      title: requiredText(WORKSHOP_TITLE_MAX_LENGTH, "titleRequired"),
      program: z.string().refine((value) => programs.includes(value), adminCode("programRequired")),
      day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, adminCode("dateInvalid")),
      startTime: z.string().regex(/^\d{2}:\d{2}$/, adminCode("timeInvalid")),
      endTime: z.string().regex(/^\d{2}:\d{2}$/, adminCode("timeInvalid")),
      capacity: z
        .number(adminCode("capacityRange"))
        .int(adminCode("capacityRange"))
        .min(1, adminCode("capacityRange"))
        .max(WORKSHOP_CAPACITY_MAX, adminCode("capacityRange")),
      priceText: requiredText(WORKSHOP_PRICE_MAX_LENGTH, "priceRequired"),
      locationText: z
        .string()
        .transform(tidy)
        .pipe(z.string().max(WORKSHOP_LOCATION_MAX_LENGTH, adminCode("textTooLong")))
        .transform((value) => value || null),
      isOpen: z.boolean(),
    })
    .superRefine((input, context) => {
      if (Number.isNaN(Date.parse(`${input.day}T00:00:00Z`))) {
        context.addIssue({ code: "custom", path: ["day"], message: "dateInvalid" });
      } else if (input.endTime <= input.startTime) {
        context.addIssue({ code: "custom", path: ["endTime"], message: "endBeforeStart" });
      }
    })
    .transform((input) => ({
      title: input.title,
      program: input.program,
      startsAt: zonedTimeToIso(input.day, input.startTime, timeZone),
      endsAt: zonedTimeToIso(input.day, input.endTime, timeZone),
      capacity: input.capacity,
      priceText: input.priceText,
      locationText: input.locationText,
      isOpen: input.isOpen,
    }));
}

export type WorkshopInput = z.infer<ReturnType<typeof workshopInputSchema>>;

type WorkshopRow = Database["public"]["Tables"]["workshops"]["Insert"];

export function toWorkshopRow(input: WorkshopInput): WorkshopRow {
  return {
    title: input.title,
    program: input.program,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    capacity: input.capacity,
    price_text: input.priceText,
    location_text: input.locationText,
    is_open: input.isOpen,
  };
}
