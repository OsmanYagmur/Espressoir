import "server-only";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { fetchWorkshopRows, workshopRowSchema, type Workshop } from "@espressoir/db";
import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

/** Every cached read of the workshops carries this tag; applications and edits expire it. */
export const WORKSHOPS_TAG = "workshops";

/** `pnpm dev:offline`: the workshops as the snapshot script read them (sample dates). */
async function readSnapshot(): Promise<unknown[]> {
  const file = resolve(process.cwd(), "../../data/workshops-snapshot.json");
  try {
    return JSON.parse(await readFile(file, "utf8")) as unknown[];
  } catch {
    return [];
  }
}

/**
 * The workshops taking applications, soonest first, each with its seats left. A cached
 * read of its own (not part of the archive): an application changes the seats, and that
 * must not re-render every coffee page. Workshops that are closed or already under way are
 * left out; the hour of cache is the most one stays after it began.
 */
export async function getOpenWorkshops(): Promise<Workshop[]> {
  "use cache";
  cacheTag(WORKSHOPS_TAG);
  cacheLife("hours");

  const rows =
    process.env.ARCHIVE_SNAPSHOT === "1"
      ? await readSnapshot()
      : await fetchWorkshopRows(createPublicClient());
  const now = Date.now();
  return rows
    .map((row) => workshopRowSchema.parse(row))
    .filter((workshop) => workshop.isOpen && Date.parse(workshop.startsAt) > now);
}
