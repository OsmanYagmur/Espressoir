import { MEDIA_BUCKET, smallPhotoPath } from "@espressoir/core";

import { env } from "./env";

/** A picture's public address in the "media" bucket (unguessable, not secret). */
export const mediaUrl = (path: string) =>
  `${env.supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;

/** Its small twin (480 px), for lists. */
export const smallMediaUrl = (path: string) => mediaUrl(smallPhotoPath(path));
