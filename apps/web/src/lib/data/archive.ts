import "server-only";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { fetchArchiveRows, parseArchive, type Archive, type ArchiveRows } from "@espressoir/db";
import { cacheLife, cacheTag } from "next/cache";

import { createPublicClient } from "@/lib/supabase/public";

/** Every cached read of the archive carries this tag; writes invalidate it. */
export const ARCHIVE_TAG = "archive";

/**
 * `pnpm dev:offline` serves the site from a snapshot built on this machine, so pages can
 * be previewed without a cloud project. The switch is never set on Vercel.
 */
async function readSnapshot(): Promise<ArchiveRows> {
  const file = resolve(process.cwd(), "../../data/archive-snapshot.json");
  return JSON.parse(await readFile(file, "utf8")) as ArchiveRows;
}

/**
 * The whole public archive: all coffees, every public tasting, the brew methods.
 *
 * One cached read feeds every public page, which keeps them fully static: the database is
 * asked only when the cache is refreshed (hourly at most, or right after a write through
 * the website), never per visitor.
 */
export async function getArchive(): Promise<Archive> {
  "use cache";
  cacheTag(ARCHIVE_TAG);
  cacheLife("hours");

  const rows =
    process.env.ARCHIVE_SNAPSHOT === "1"
      ? await readSnapshot()
      : await fetchArchiveRows(createPublicClient());
  return parseArchive(rows);
}
