import "server-only";

import { MEDIA_BUCKET, MEDIA_KINDS, smallPhotoPath } from "@espressoir/core";
import type { TypedSupabaseClient } from "@espressoir/db";

/**
 * Removes the files of pictures nothing points at any more, as whoever is signed in (the
 * bucket's rules let members remove their own files and admins anyone's). Never throws:
 * a file that could not be removed is picked up by `pnpm media:sweep`.
 */
export async function removeMedia(
  supabase: TypedSupabaseClient,
  paths: readonly (string | null | undefined)[],
): Promise<void> {
  const files = paths.flatMap((path) => (path ? [path, smallPhotoPath(path)] : []));
  if (files.length === 0) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(files);
  if (error) console.error("[media] files not removed:", error.message);
}

/** Removes every picture a member has stored: what leaving the site has to include. */
export async function removeAllMediaOf(
  supabase: TypedSupabaseClient,
  userId: string,
): Promise<void> {
  const bucket = supabase.storage.from(MEDIA_BUCKET);
  for (const kind of MEDIA_KINDS) {
    const folder = `${kind}/${userId}`;
    // A member has at most a few hundred files; a thousand per folder is ample.
    const { data, error } = await bucket.list(folder, { limit: 1000 });
    if (error) {
      console.error("[media] folder not listed:", error.message);
      continue;
    }
    const files = (data ?? []).map((file) => `${folder}/${file.name}`);
    if (files.length === 0) continue;
    const removed = await bucket.remove(files);
    if (removed.error) console.error("[media] files not removed:", removed.error.message);
  }
}
