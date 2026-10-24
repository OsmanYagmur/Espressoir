"use server";

import { WORKSHOP_STATUSES, siteConfig } from "@espressoir/core";
import {
  adminApplicationInputSchema,
  toAdminApplicationInsert,
  toWorkshopRow,
  workshopInputSchema,
} from "@espressoir/db";
import { redirect } from "next/navigation";
import { z } from "zod";

import { WORKSHOP_PROGRAMS } from "@/content/atolye";
import { requireAdmin } from "@/lib/auth";
import { refreshWorkshops } from "@/lib/data/refresh-archive";
import { sendTestMail } from "@/lib/workshop-mail";

const SECTION = "/osman/atolyeler";

/** Back to the workshops, to the one just changed when there is one. */
function back(error?: string, workshopId?: string): never {
  const anchor = workshopId ? `#atolye-${workshopId}` : "";
  redirect(error ? `${SECTION}?hata=${error}${anchor}` : `${SECTION}?tamam=1${anchor}`);
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();
const id = z.uuid();

/**
 * Adds a workshop, or (with `workshopId`) changes one. Plain table writes as the signed-in
 * admin: row level security lets only admins write workshops. The field is
 * `workshopTitle`, not `title`: a control named after a property of its form replaces it.
 */
export async function saveWorkshop(formData: FormData): Promise<void> {
  const parsed = workshopInputSchema(Object.keys(WORKSHOP_PROGRAMS), siteConfig.timeZone).safeParse(
    {
      title: text(formData, "workshopTitle"),
      program: text(formData, "program"),
      day: text(formData, "day"),
      startTime: text(formData, "startTime"),
      endTime: text(formData, "endTime"),
      capacity: Number(text(formData, "capacity")),
      priceText: text(formData, "priceText"),
      locationText: text(formData, "locationText"),
      isOpen: formData.get("isOpen") === "on",
    },
  );
  if (!parsed.success) back("workshop_invalid");

  const { supabase } = await requireAdmin();
  const workshopId = text(formData, "workshopId");
  const row = toWorkshopRow(parsed.data);
  const { error } = workshopId
    ? await supabase.from("workshops").update(row).eq("id", workshopId)
    : await supabase.from("workshops").insert(row);
  if (error) {
    console.error("[admin] workshop refused:", error.message);
    back("workshop_invalid");
  }
  refreshWorkshops();
  back(undefined, workshopId || undefined);
}

/**
 * Adds a person who did not fill in the form (agreed on the phone or in person), with the
 * status chosen. The database marks the row as added from the panel and lets an admin add
 * to a closed or full workshop; one row per phone number or handle still holds.
 */
export async function addApplicant(formData: FormData): Promise<void> {
  const workshopId = text(formData, "workshopId");
  const parsed = adminApplicationInputSchema.safeParse({
    workshopId,
    name: text(formData, "applicantName"),
    contact: text(formData, "contact"),
    experience: text(formData, "experience"),
    question: text(formData, "note"),
    consent: formData.get("consent") === "on",
    status: text(formData, "status"),
  });
  if (!parsed.success) back("applicant_invalid", workshopId || undefined);

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("workshop_applications")
    .insert(toAdminApplicationInsert(parsed.data));
  if (error) {
    console.error("[admin] applicant refused:", error.message);
    back(error.code === "23505" ? "applicant_duplicate" : "unknown", workshopId);
  }
  refreshWorkshops();
  back(undefined, workshopId);
}

/**
 * Answers an application with one click: each answer is its own submit button carrying
 * the status (approve, hold, waitlist, reject), so the form works without JavaScript.
 */
export async function setApplicationStatus(formData: FormData): Promise<void> {
  const parsed = z
    .object({ applicationId: id, workshopId: id, status: z.enum(WORKSHOP_STATUSES) })
    .safeParse({
      applicationId: formData.get("applicationId"),
      workshopId: formData.get("workshopId"),
      status: formData.get("status"),
    });
  if (!parsed.success) back("invalid");

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("workshop_applications")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.applicationId);
  if (error) back("unknown", parsed.data.workshopId);
  refreshWorkshops();
  back(undefined, parsed.data.workshopId);
}

/** Marks whether an approved person came ("" takes the mark back). */
export async function setAttendance(formData: FormData): Promise<void> {
  const parsed = z
    .object({ applicationId: id, workshopId: id, attended: z.enum(["", "true", "false"]) })
    .safeParse({
      applicationId: formData.get("applicationId"),
      workshopId: formData.get("workshopId"),
      attended: formData.get("attended") ?? "",
    });
  if (!parsed.success) back("invalid");

  const { supabase } = await requireAdmin();
  const { attended } = parsed.data;
  const { error } = await supabase
    .from("workshop_applications")
    .update({ attended: attended === "" ? null : attended === "true" })
    .eq("id", parsed.data.applicationId);
  if (error) back("unknown", parsed.data.workshopId);
  refreshWorkshops();
  back(undefined, parsed.data.workshopId);
}

/** Removes an application for good (after the workshop, or on the applicant's request). */
export async function deleteApplication(formData: FormData): Promise<void> {
  const parsed = z.object({ applicationId: id, workshopId: id, sure: z.literal("on") }).safeParse({
    applicationId: formData.get("applicationId"),
    workshopId: formData.get("workshopId"),
    sure: formData.get("sure"),
  });
  if (!parsed.success) back("invalid");

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("workshop_applications")
    .delete()
    .eq("id", parsed.data.applicationId);
  if (error) back("unknown", parsed.data.workshopId);
  refreshWorkshops();
  back(undefined, parsed.data.workshopId);
}

/** Sends a test of the application mail to the owner's address, as set on Vercel. */
export async function testApplicationMail(): Promise<void> {
  await requireAdmin();
  const result = await sendTestMail();
  if (result === "sent") redirect(`${SECTION}?tamam=posta`);
  back(result === "missing" ? "mail_missing" : "mail_failed");
}

/**
 * Notes that the admin opened WhatsApp to ask for an answer or to remind: called from the
 * panel's buttons as the chat opens, so the panel can say when each person was asked. The
 * message itself is sent from the admin's own WhatsApp; nothing leaves the site.
 */
export async function noteMessageSent(applicationId: string, kind: "ask" | "remind") {
  const parsed = id.safeParse(applicationId);
  if (!parsed.success) return;
  const { supabase } = await requireAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("workshop_applications")
    .update(kind === "ask" ? { rsvp_asked_at: now } : { reminded_at: now })
    .eq("id", parsed.data);
  if (error) console.error("[admin] message note refused:", error.message);
}
