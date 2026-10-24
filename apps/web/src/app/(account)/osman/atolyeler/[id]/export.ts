import "server-only";

import { siteConfig, slugify, type WorkshopStatus } from "@espressoir/core";
import { workshopRowSchema, type Workshop, type WorkshopApplication } from "@espressoir/db";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";

import { readApplications } from "../data";

const w = t.admin.workshops;

/** Approved people first (the list for the day), then those waiting, the waitlist, the rest. */
const STATUS_ORDER: readonly WorkshopStatus[] = ["approved", "pending", "waitlist", "rejected"];

const stampFormat = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: siteConfig.timeZone,
});

export interface WorkshopExport {
  workshop: Workshop;
  applications: WorkshopApplication[];
  /** "kahve-101-2026-11-22-basvurular", without the extension. */
  fileName: string;
}

/**
 * One workshop and its applications for a download, read as the signed-in admin (row level
 * security lets only admins read applications). Anyone else, or an unknown id: null, and
 * the route answers 404.
 */
export async function readWorkshopExport(rawId: string): Promise<WorkshopExport | null> {
  const session = await getCurrentUser();
  const id = z.uuid().safeParse(rawId);
  if (session?.user.role !== "admin" || !id.success) return null;

  const { supabase } = session;
  const [workshop, applications] = await Promise.all([
    supabase.from("workshop_overview").select("*").eq("workshop_id", id.data).maybeSingle(),
    readApplications(supabase, id.data),
  ]);
  if (!workshop.data || !applications) return null;

  const parsed = workshopRowSchema.parse(workshop.data);
  const rank = (status: WorkshopStatus) => STATUS_ORDER.indexOf(status);
  return {
    workshop: parsed,
    // Stable: within a status, in the order they came.
    applications: applications.sort((a, b) => rank(a.status) - rank(b.status)),
    fileName: `${slugify(parsed.title)}-${parsed.startsAt.slice(0, 10)}-${w.exportFile}`,
  };
}

/** The columns both files share, in order. */
export const EXPORT_COLUMNS = [
  "name",
  "contact",
  "experience",
  "status",
  "attendance",
  "rsvp",
  "source",
  "createdAt",
  "question",
] as const;
export type ExportColumn = (typeof EXPORT_COLUMNS)[number];

/** One application as the files show it: every value already words. */
export function exportRow(application: WorkshopApplication): Record<ExportColumn, string> {
  const states = w.attendanceStates;
  return {
    name: application.name,
    contact: application.contact,
    experience: t.workshop.form.experiences[application.experience].title,
    status: w.statuses[application.status],
    attendance:
      application.attended === null ? "" : application.attended ? states.came : states.missed,
    rsvp: application.rsvp === null ? "" : w.rsvp.states[application.rsvp],
    source: w.sources[application.source],
    createdAt: stampFormat.format(new Date(application.createdAt)),
    question: application.question ?? "",
  };
}

/** The headers for a download: the file's type and name, never cached. */
export const downloadHeaders = (contentType: string, file: string) => ({
  "content-type": contentType,
  "content-disposition": `attachment; filename="${file}"`,
  "cache-control": "no-store",
});
