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
import { NativeModules } from "react-native";
import {
  launchCamera,
  launchImageLibrary,
  type CameraOptions,
  type ImagePickerResponse,
} from "react-native-image-picker";

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
  const options: CameraOptions = {
    mediaType: "photo",
    quality: 1,
    // No EXIF dictionary in the answer, and HEIC handed over as a JPEG the resizer can read.
    includeExtra: false,
    assetRepresentationMode: "compatible",
  };
  const result: ImagePickerResponse =
    source === "camera" ? await launchCamera(options) : await launchImageLibrary(options);
  if (result.didCancel) return null;
  if (result.errorCode === "permission") throw new PhotoFailure("permission");
  if (result.errorCode) throw new PhotoFailure("unreadable");
  const asset = result.assets?.[0];
  if (!asset?.uri || !asset.width || !asset.height) return null;
  if ((asset.fileSize ?? 0) > PHOTO_SOURCE_MAX_BYTES) throw new PhotoFailure("tooLarge");
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

interface Prepared {
  width: number;
  height: number;
  bytes: Uint8Array;
}

/** A file on the phone, as bytes (React Native's fetch reads file:// addresses). */
async function readBytes(uri: string): Promise<Uint8Array> {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new PhotoFailure("unreadable"));
    reader.readAsArrayBuffer(blob);
  });
}

/** The app's own native module (ios/EspressoirNative/ImageShrinker.m). */
const { ImageShrinker } = NativeModules as {
  ImageShrinker: {
    shrink(
      uri: string,
      maxWidth: number,
      maxHeight: number,
      quality: number,
    ): Promise<{ uri: string; width: number; height: number; size: number }>;
  };
};

/**
 * Shrinks a picture to `edge` and re-encodes it as JPEG (the website accepts it too),
 * lowering the quality until it fits the bucket's limit. Re-encoding leaves the camera's
 * metadata behind; the bytes are checked anyway, and a picture that still carries any is
 * refused rather than uploaded.
 */
async function prepare(photo: PickedPhoto, edge: number, startQuality: number): Promise<Prepared> {
  const size = fitWithin(photo.width, photo.height, edge);
  for (let quality = startQuality; quality >= 0.4; quality -= 0.12) {
    let resized;
    try {
      resized = await ImageShrinker.shrink(photo.uri, size.width, size.height, quality);
    } catch {
      throw new PhotoFailure("unreadable");
    }
    if (resized.size > PHOTO_MAX_BYTES) continue;
    const bytes = await readBytes(resized.uri);
    if (hasCameraMetadata(bytes)) throw new PhotoFailure("metadata");
    return { width: resized.width, height: resized.height, bytes };
  }
  throw new PhotoFailure("tooLarge");
}

async function send(path: string, photo: Prepared): Promise<void> {
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    // A path is used once (the file id is new each time), so it can be cached for good.
    .upload(path, photo.bytes.buffer as ArrayBuffer, {
      contentType: "image/jpeg",
      cacheControl: "31536000",
    });
  if (error) throw new PhotoFailure("upload");
}

/** A random (v4) UUID for a file name; crypto.getRandomValues comes from index.js's polyfill. */
function randomUUID(): string {
  const bytes = new Uint8Array(16);
  (
    globalThis as unknown as { crypto: { getRandomValues(array: Uint8Array): Uint8Array } }
  ).crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
  const small = await prepare(photo, PHOTO_SMALL_EDGE, 0.76);
  const path = mediaPath("tastings", userId, randomUUID(), "jpg");
  await send(path, full);
  await send(smallPhotoPath(path), small);
  return { path, width: full.width, height: full.height };
}
