import "server-only";

import {
  WORKSHOP_APPLICATION_SELECT,
  workshopApplicationRowSchema,
  workshopRowSchema,
  type TypedSupabaseClient,
  type Workshop,
  type WorkshopApplication,
} from "@espressoir/db";

/** The columns the applications had before people could be added from the panel. */
const FIRST_SELECT = "id, workshop_id, name, contact, experience, question, status, created_at";

/**
 * Every workshop (newest first) and every application (oldest first), as the signed-in
 * admin: row level security shows applications to admins only. A database that has not
 * had this step's migration yet still answers, without who came and who was added.
 */
export async function readWorkshopAdmin(supabase: TypedSupabaseClient): Promise<{
  workshops: Workshop[];
  applications: WorkshopApplication[];
}> {
  const applicationsWith = (columns: string) =>
    supabase.from("workshop_applications").select(columns).order("created_at");
  const [workshops, first] = await Promise.all([
    supabase.from("workshop_overview").select("*").order("starts_at", { ascending: false }),
    applicationsWith(WORKSHOP_APPLICATION_SELECT),
  ]);
  const applications = first.error ? await applicationsWith(FIRST_SELECT) : first;

  return {
    // A database without workshops yet (code deployed before its migration): none.
    workshops: workshops.error ? [] : workshops.data.map((row) => workshopRowSchema.parse(row)),
    applications: applications.error
      ? []
      : (applications.data as unknown[]).map((row) => workshopApplicationRowSchema.parse(row)),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What the overview needs, as of this request: the open workshops still ahead, and how
 * many applications came through the form over the last `days` days (the admin pages are
 * rendered per request, so "now" is the visit's).
 */
export function workshopPulse(
  workshops: readonly Workshop[],
  applications: readonly WorkshopApplication[],
  days: number,
): { open: Workshop[]; formApplications: number } {
  const now = Date.now();
  return {
    open: workshops.filter(({ isOpen, startsAt }) => isOpen && Date.parse(startsAt) > now),
    formApplications: applications.filter(
      ({ source, createdAt }) => source === "form" && Date.parse(createdAt) >= now - days * DAY_MS,
    ).length,
  };
}
