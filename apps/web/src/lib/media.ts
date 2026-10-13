import { MEDIA_BUCKET, smallPhotoPath } from "@espressoir/core";

/**
 * The public address of a picture in Storage, or null where no Supabase is configured (the
 * offline preview). Safe on the server and in the browser: it only reads the public URL.
 */
export function mediaUrl(path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${path}` : null;
}

/** The small twin of a tasting's picture, for lists. */
export const smallMediaUrl = (path: string) => mediaUrl(smallPhotoPath(path));
