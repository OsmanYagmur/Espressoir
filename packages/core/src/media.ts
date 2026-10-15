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

const ascii = (bytes: Uint8Array, at: number, text: string) =>
  [...text].every((char, index) => bytes[at + index] === char.charCodeAt(0));

/**
 * Whether an encoded picture still carries what a camera writes beside the pixels: EXIF
 * (place, time, device) or XMP. A re-encoded picture must not; an app can check its own
 * output with this before it uploads anything. Reads JPEG markers up to the image data,
 * and WebP chunks (and the VP8X flags that announce them). Other formats count as carrying
 * metadata, so nothing unexpected gets through.
 */
export function hasCameraMetadata(bytes: Uint8Array): boolean {
  // JPEG: FF D8, then marker segments until the scan (FF DA).
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let at = 2;
    while (at + 4 <= bytes.length && bytes[at] === 0xff) {
      const marker = bytes[at + 1]!;
      if (marker === 0xda || marker === 0xd9) return false;
      const length = (bytes[at + 2]! << 8) | bytes[at + 3]!;
      if (
        marker === 0xe1 &&
        (ascii(bytes, at + 4, "Exif") || ascii(bytes, at + 4, "http://ns.adobe.com/xap"))
      ) {
        return true;
      }
      at += 2 + length;
    }
    return false;
  }
  // WebP: "RIFF" size "WEBP", then chunks of FourCC + little-endian size (+ padding).
  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) {
    let at = 12;
    while (at + 8 <= bytes.length) {
      if (ascii(bytes, at, "EXIF") || ascii(bytes, at, "XMP ")) return true;
      // VP8X announces EXIF (0x08) and XMP (0x04) in its flags byte.
      if (ascii(bytes, at, "VP8X") && (bytes[at + 8]! & 0x0c) !== 0) return true;
      const size =
        bytes[at + 4]! | (bytes[at + 5]! << 8) | (bytes[at + 6]! << 16) | (bytes[at + 7]! << 24);
      at += 8 + size + (size % 2);
    }
    return false;
  }
  return true;
}
