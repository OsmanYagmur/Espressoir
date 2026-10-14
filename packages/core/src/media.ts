/**
 * Pictures: one per tasting, one per profile. The limits here are what the browser works
 * to before it uploads; Storage and the database enforce them again.
 */

/** The Supabase Storage bucket every picture lives in. */
export const MEDIA_BUCKET = "media";

/** The longest edge of a tasting's picture, and of its small twin for lists. */
export const PHOTO_MAX_EDGE = 1600;
export const PHOTO_SMALL_EDGE = 480;
/** A profile picture is a square of this size (and has no small twin). */
export const AVATAR_EDGE = 400;

/** What the bucket accepts per file. */
export const PHOTO_MAX_BYTES = 600 * 1024;
/** What a person may pick: anything bigger is not even opened. */
export const PHOTO_SOURCE_MAX_BYTES = 25 * 1024 * 1024;
export const PHOTO_ALT_MAX_LENGTH = 140;

export const MEDIA_KINDS = ["tastings", "avatars"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];
export const MEDIA_EXTENSIONS = ["webp", "jpg"] as const;
export type MediaExtension = (typeof MEDIA_EXTENSIONS)[number];

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
/** `<kind>/<member id>/<file id>.<ext>`: the shape the database's checks insist on. */
export const MEDIA_PATH_PATTERN = new RegExp(`^(tastings|avatars)/${UUID}/${UUID}\\.(webp|jpg)$`);

/** Where a member's new picture goes. Both ids are uuids; the file's is made by the browser. */
export function mediaPath(
  kind: MediaKind,
  userId: string,
  fileId: string,
  extension: MediaExtension,
): string {
  return `${kind}/${userId}/${fileId}.${extension}`;
}

/** The small twin of a tasting's picture: "…/abc.webp" → "…/abc-s.webp". */
export function smallPhotoPath(path: string): string {
  return path.replace(/\.(webp|jpg)$/, "-s.$1");
}

/**
 * The size a picture is drawn at so that its longest edge is at most `edge`. Never
 * enlarges; keeps the proportions; at least one pixel each way.
 */
export function fitWithin(
  width: number,
  height: number,
  edge: number,
): { width: number; height: number } {
  const scale = Math.min(1, edge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** The largest centred square of a picture, for cropping a profile picture. */
export function centredSquare(
  width: number,
  height: number,
): { x: number; y: number; size: number } {
  const size = Math.min(width, height);
  return { x: Math.round((width - size) / 2), y: Math.round((height - size) / 2), size };
}
