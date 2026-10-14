import {
  AVATAR_EDGE,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_EDGE,
  PHOTO_SMALL_EDGE,
  PHOTO_SOURCE_MAX_BYTES,
  centredSquare,
  fitWithin,
  type MediaExtension,
} from "@espressoir/core";

export type PhotoProblem = "notImage" | "tooLarge" | "unreadable" | "tooHeavy";

/** Why a picture could not be prepared, as something to tell the person. */
export class PhotoError extends Error {
  constructor(readonly kind: PhotoProblem) {
    super(kind);
  }
}

export interface PreparedPhoto {
  blob: Blob;
  width: number;
  height: number;
  extension: MediaExtension;
  contentType: "image/webp" | "image/jpeg";
}

interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Opens the file as pixels, turned the way the camera meant it. */
async function decode(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith("image/")) throw new PhotoError("notImage");
  if (file.size > PHOTO_SOURCE_MAX_BYTES) throw new PhotoError("tooLarge");
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // A format this browser cannot read (HEIC outside Safari, a broken file).
    throw new PhotoError("unreadable");
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Draws part of the picture at a size and encodes it, small enough for the bucket.
 *
 * Drawing onto a canvas and encoding from there is what removes everything the camera
 * wrote beside the pixels: location, device, time. Nothing of the original file is sent.
 * WebP where the browser can write it, JPEG where it cannot; `as` pins the format, so a
 * picture and its small twin end up with the same extension.
 */
async function encode(
  source: ImageBitmap,
  crop: Crop,
  size: { width: number; height: number },
  as?: PreparedPhoto["contentType"],
): Promise<PreparedPhoto> {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new PhotoError("unreadable");
  context.imageSmoothingQuality = "high";
  context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, size.width, size.height);

  for (const quality of [0.82, 0.72, 0.6, 0.5]) {
    let blob = as === "image/jpeg" ? null : await toBlob(canvas, "image/webp", quality);
    // Asked for WebP and got something else: this browser cannot write it.
    if (!blob || blob.type !== "image/webp") {
      if (as === "image/webp") throw new PhotoError("unreadable");
      blob = await toBlob(canvas, "image/jpeg", quality);
    }
    if (!blob) throw new PhotoError("unreadable");
    if (blob.size <= PHOTO_MAX_BYTES) {
      const contentType = blob.type === "image/webp" ? "image/webp" : "image/jpeg";
      return {
        blob,
        width: size.width,
        height: size.height,
        contentType,
        extension: contentType === "image/webp" ? "webp" : "jpg",
      };
    }
  }
  throw new PhotoError("tooHeavy");
}

/** A tasting's picture, ready to upload: the full one and its small twin for lists. */
export async function prepareTastingPhoto(
  file: File,
): Promise<{ full: PreparedPhoto; small: PreparedPhoto }> {
  const source = await decode(file);
  try {
    const whole = { x: 0, y: 0, width: source.width, height: source.height };
    const full = await encode(
      source,
      whole,
      fitWithin(source.width, source.height, PHOTO_MAX_EDGE),
    );
    const small = await encode(
      source,
      whole,
      fitWithin(source.width, source.height, PHOTO_SMALL_EDGE),
      full.contentType,
    );
    return { full, small };
  } finally {
    source.close();
  }
}

/** A profile picture: the middle of the picture, as a square. */
export async function prepareAvatar(file: File): Promise<PreparedPhoto> {
  const source = await decode(file);
  try {
    const square = centredSquare(source.width, source.height);
    const edge = Math.min(square.size, AVATAR_EDGE);
    return await encode(
      source,
      { x: square.x, y: square.y, width: square.size, height: square.size },
      { width: edge, height: edge },
    );
  } finally {
    source.close();
  }
}
