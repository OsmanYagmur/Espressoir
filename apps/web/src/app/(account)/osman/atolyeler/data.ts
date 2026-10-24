import "server-only";

import {
  WORKSHOP_APPLICATION_SELECTS,
  workshopApplicationRowSchema,
  workshopRowSchema,
  type TypedSupabaseClient,
  type Workshop,
  type WorkshopApplication,
} from "@espressoir/db";

/**
 * Applications (oldest first; one workshop's, or all), as the signed-in admin: row level
 * security shows them to admins only. A database that has not had a later migration yet
 * still answers with the columns it has (`WORKSHOP_APPLICATION_SELECTS`); none: [].
 */
export async function readApplications(
  supabase: TypedSupabaseClient,
  workshopId?: string,
): Promise<WorkshopApplication[] | null> {
  for (const columns of WORKSHOP_APPLICATION_SELECTS) {
    const query = supabase.from("workshop_applications").select(columns).order("created_at");
    const { data, error } = await (workshopId ? query.eq("workshop_id", workshopId) : query);
    if (!error) return (data as unknown[]).map((row) => workshopApplicationRowSchema.parse(row));
  }
  return null;
}

/** Every workshop (newest first) and every application (oldest first), as the admin. */
export async function readWorkshopAdmin(supabase: TypedSupabaseClient): Promise<{
  workshops: Workshop[];
  applications: WorkshopApplication[];
}> {
  const [workshops, applications] = await Promise.all([
    supabase.from("workshop_overview").select("*").order("starts_at", { ascending: false }),
    readApplications(supabase),
  ]);
  return {
    // A database without workshops yet (code deployed before its migration): none.
    workshops: workshops.error ? [] : workshops.data.map((row) => workshopRowSchema.parse(row)),
    applications: applications ?? [],
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
