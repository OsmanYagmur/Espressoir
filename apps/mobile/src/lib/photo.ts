import {
  MEDIA_BUCKET,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_EDGE,
  PHOTO_SMALL_EDGE,
  PHOTO_SOURCE_MAX_BYTES,
  fitWithin,
  hasCameraMetadata,
  mediaPath,
  smallPhotoPath,
} from "@espressoir/core";
import { randomUUID } from "expo-crypto";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { supabase } from "./supabase";

export type PhotoProblem = "permission" | "tooLarge" | "unreadable" | "metadata" | "upload";

export class PhotoFailure extends Error {
  constructor(readonly kind: PhotoProblem) {
    super(kind);
  }
}

/** A picture chosen on the phone, not yet prepared. */
export interface PickedPhoto {
  uri: string;
  width: number;
  height: number;
}

/** From the camera or the photo library. Null when the member changed their mind. */
export async function pickPhoto(source: "camera" | "library"): Promise<PickedPhoto | null> {
  if (source === "camera") {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) throw new PhotoFailure("permission");
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 1,
    exif: false,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  if ((asset.fileSize ?? 0) > PHOTO_SOURCE_MAX_BYTES) throw new PhotoFailure("tooLarge");
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

interface Prepared {
  uri: string;
  width: number;
  height: number;
  extension: "webp" | "jpg";
  contentType: string;
  bytes: Uint8Array;
}

/**
 * Shrinks a picture to `edge` and re-encodes it (WebP, JPEG where WebP cannot be written)
 * until it fits the bucket's limit, the same rules as the website (lib/image-resize.ts
 * there). Re-encoding leaves the camera's metadata behind; the bytes are checked anyway,
 * and a picture that still carries any is refused rather than uploaded.
 */
async function prepare(
  photo: PickedPhoto,
  edge: number,
  startQuality: number,
  formats: readonly SaveFormat[] = [SaveFormat.WEBP, SaveFormat.JPEG],
): Promise<Prepared> {
  const size = fitWithin(photo.width, photo.height, edge);
  let rendered;
  try {
    rendered = await ImageManipulator.manipulate(photo.uri).resize(size).renderAsync();
  } catch {
    throw new PhotoFailure("unreadable");
  }
  for (const format of formats) {
    for (let quality = startQuality; quality >= 0.4; quality -= 0.12) {
      let saved;
      try {
        saved = await rendered.saveAsync({ format, compress: quality });
      } catch {
        break; // This format cannot be written here: try the next one.
      }
      const file = new File(saved.uri);
      const bytes = await file.bytes();
      if (bytes.length > PHOTO_MAX_BYTES) {
        file.delete();
        continue;
      }
      if (hasCameraMetadata(bytes)) {
        file.delete();
        throw new PhotoFailure("metadata");
      }
      const webp = format === SaveFormat.WEBP;
      return {
        uri: saved.uri,
        width: saved.width,
        height: saved.height,
        extension: webp ? "webp" : "jpg",
        contentType: webp ? "image/webp" : "image/jpeg",
        bytes,
      };
    }
  }
  throw new PhotoFailure("tooLarge");
}

async function send(path: string, photo: Prepared): Promise<void> {
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    // A path is used once (the file id is new each time), so it can be cached for good.
    .upload(path, photo.bytes.buffer as ArrayBuffer, {
      contentType: photo.contentType,
      cacheControl: "31536000",
    });
  if (error) throw new PhotoFailure("upload");
}

/**
 * Prepares and uploads a tasting's picture and its small twin into the member's folder;
 * returns what the tasting should store (attached with set_tasting_photo_v1).
 */
export async function uploadTastingPhoto(
  userId: string,
  photo: PickedPhoto,
): Promise<{ path: string; width: number; height: number }> {
  const full = await prepare(photo, PHOTO_MAX_EDGE, 0.82);
  // The twin's name is derived from the full picture's, extension included: same format.
  const small = await prepare(photo, PHOTO_SMALL_EDGE, 0.76, [
    full.extension === "webp" ? SaveFormat.WEBP : SaveFormat.JPEG,
  ]);
  const path = mediaPath("tastings", userId, randomUUID(), full.extension);
  await send(path, full);
  await send(smallPhotoPath(path), small);
  for (const file of [full, small]) new File(file.uri).delete();
  return { path, width: full.width, height: full.height };
}
