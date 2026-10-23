import "server-only";

import { revalidateTag, updateTag } from "next/cache";
import { after } from "next/server";

import { ARCHIVE_TAG } from "./archive";
import { WORKSHOPS_TAG } from "./workshops";

/** Long enough for any read of the archive that was under way to have finished. */
const ECHO_MS = 2000;

/**
 * Call from a Server Action after a write that shows on public pages.
 *
 * `updateTag` makes the next read of the archive a fresh one. That alone leaves a gap: a
 * read that was already running when the write landed (another visitor's page, a link
 * being fetched ahead, the previous change's own refresh) finishes afterwards and is kept
 * as if it were current, although it began before the write and does not contain it. The
 * page would then show the old state until the cache runs out.
 *
 * So the tag is expired once more a moment later, when any such read is certainly done.
 * Two quick changes in a row, or a change made while someone else is loading a page, end
 * up correct within a couple of seconds instead of within the hour.
 */
export function refreshArchive(): void {
  updateTag(ARCHIVE_TAG);
  expireAgainSoon(ARCHIVE_TAG);
}

/** The same for the workshops' own read: after an application, or an admin's change. */
export function refreshWorkshops(): void {
  updateTag(WORKSHOPS_TAG);
  expireAgainSoon(WORKSHOPS_TAG);
}

/**
 * The same from a Route Handler, where `updateTag` is not available: the tag expires at
 * once (the next read is a fresh one) and once more a moment later.
 */
export function expireArchive(): void {
  revalidateTag(ARCHIVE_TAG, { expire: 0 });
  expireAgainSoon(ARCHIVE_TAG);
}

function expireAgainSoon(tag: string): void {
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, ECHO_MS));
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (error) {
      console.error(`[${tag}] second refresh failed:`, error instanceof Error ? error.message : error);
    }
  });
}
