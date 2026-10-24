"use server";

import { WORKSHOP_STATUSES, siteConfig } from "@espressoir/core";
import { toWorkshopRow, workshopInputSchema } from "@espressoir/db";
import { redirect } from "next/navigation";
import { z } from "zod";

import { WORKSHOP_PROGRAMS } from "@/content/atolye";
import { requireAdmin } from "@/lib/auth";
import { refreshWorkshops } from "@/lib/data/refresh-archive";

const SECTION = "/panel/yonetim";

function back(error?: string): never {
  redirect(error ? `${SECTION}?hata=${error}#atolyeler` : `${SECTION}?tamam=1#atolyeler`);
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
  back();
}

/** Approves, rejects or waitlists an application; the seats left follow. */
export async function setApplicationStatus(formData: FormData): Promise<void> {
  const parsed = z
    .object({ applicationId: id, status: z.enum(WORKSHOP_STATUSES) })
    .safeParse({ applicationId: formData.get("applicationId"), status: formData.get("status") });
  if (!parsed.success) back("invalid");

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("workshop_applications")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.applicationId);
  if (error) back("unknown");
  refreshWorkshops();
  back();
}

/** Removes an application for good (after the workshop, or on the applicant's request). */
export async function deleteApplication(formData: FormData): Promise<void> {
  const parsed = z
    .object({ applicationId: id, sure: z.literal("on") })
    .safeParse({ applicationId: formData.get("applicationId"), sure: formData.get("sure") });
  if (!parsed.success) back("invalid");

  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("workshop_applications")
    .delete()
    .eq("id", parsed.data.applicationId);
  if (error) back("unknown");
  refreshWorkshops();
  back();
}
