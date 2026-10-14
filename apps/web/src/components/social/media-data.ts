/**
 * Uploading pictures: prepared in the browser (shrunk, re-encoded, stripped of what the
 * camera wrote beside the pixels) and sent straight to Supabase Storage, where the
 * bucket's rules let a member write into their own folders only.
 *
 * Loaded on demand: it brings the Supabase client and the image code with it.
 */
import { MEDIA_BUCKET, mediaPath, smallPhotoPath, type MediaKind } from "@espressoir/core";

import {
  PhotoError,
  prepareAvatar,
  prepareTastingPhoto,
  type PreparedPhoto,
} from "@/lib/image-resize";
import { getBrowserSupabase } from "@/lib/supabase/browser";

export type UploadProblem = PhotoError["kind"] | "restricted" | "signedOut" | "failed";

export class UploadFailure extends Error {
  constructor(readonly kind: UploadProblem) {
    super(kind);
  }
}

async function viewerId(): Promise<string> {
  const { data } = await getBrowserSupabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new UploadFailure("signedOut");
  return id;
}

async function send(path: string, photo: PreparedPhoto): Promise<void> {
  const { error } = await getBrowserSupabase()
    .storage.from(MEDIA_BUCKET)
    // A path is used once (the file id is new each time), so it can be cached for good.
    .upload(path, photo.blob, { contentType: photo.contentType, cacheControl: "31536000" });
  if (!error) return;
  const refused = /row-level security|Unauthorized|403/i.test(error.message);
  throw new UploadFailure(refused ? "restricted" : "failed");
}

async function prepared<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (failure) {
    if (failure instanceof PhotoError) throw new UploadFailure(failure.kind);
    throw failure;
  }
}

const newPath = async (kind: MediaKind, photo: PreparedPhoto) =>
  mediaPath(kind, await viewerId(), crypto.randomUUID(), photo.extension);

/** Uploads a tasting's picture and its small twin; returns what the tasting should store. */
export async function uploadTastingPhoto(
  file: File,
): Promise<{ path: string; width: number; height: number }> {
  const { full, small } = await prepared(() => prepareTastingPhoto(file));
  const path = await newPath("tastings", full);
  await send(path, full);
  await send(smallPhotoPath(path), small);
  return { path, width: full.width, height: full.height };
}

export async function uploadAvatar(file: File): Promise<{ path: string }> {
  const photo = await prepared(() => prepareAvatar(file));
  const path = await newPath("avatars", photo);
  await send(path, photo);
  return { path };
}

/**
 * Removes pictures that were uploaded but never attached to anything (the person picked
 * another one before saving). Best effort: whatever is left is swept up later.
 */
export async function discardUploads(paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  await getBrowserSupabase()
    .storage.from(MEDIA_BUCKET)
    .remove(paths.flatMap((path) => [path, smallPhotoPath(path)]))
    .catch(() => undefined);
}
