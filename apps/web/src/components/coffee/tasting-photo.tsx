import { PHOTO_SMALL_EDGE, fitWithin } from "@espressoir/core";
import type { Tasting } from "@espressoir/db";

import { format, t } from "@/lib/i18n";
import { mediaUrl, smallMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

/**
 * A tasting's picture. `small` is the twin made for lists; the full one is for the
 * tasting's own page. A plain <img> with its size written out, so the page keeps its
 * shape while the picture loads: the files are already the right size, and the host's
 * image service (with its small free quota) is not needed.
 */
export function TastingPhoto({
  tasting,
  small = false,
  className,
}: {
  tasting: Pick<Tasting, "photo" | "coffee">;
  small?: boolean;
  className?: string;
}) {
  const { photo } = tasting;
  if (!photo) return null;
  const src = small ? smallMediaUrl(photo.path) : mediaUrl(photo.path);
  if (!src) return null;
  const size = small ? fitWithin(photo.width, photo.height, PHOTO_SMALL_EDGE) : photo;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- see the note above
    <img
      src={src}
      width={size.width}
      height={size.height}
      alt={photo.alt ?? format(t.photo.defaultAlt, { coffee: tasting.coffee.name })}
      loading="lazy"
      decoding="async"
      className={cn("h-auto max-w-full border border-border bg-muted", className)}
    />
  );
}
