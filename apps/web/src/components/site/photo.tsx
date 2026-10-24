import { PHOTOS, type PhotoId } from "@/content/photos";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const file = (id: PhotoId, width: 640 | 1280) => `/images/${id}-${width}.webp`;

/**
 * One of the site's photos (content/photos.ts), the browser picking the file for the room
 * it gets (`sizes`). `decorative` leaves the description out where a title beside it
 * already says everything (a card). Plain <img>: the files are already the right size.
 */
export function PhotoImage({
  id,
  sizes,
  priority = false,
  decorative = false,
  className,
}: {
  id: PhotoId;
  sizes: string;
  /** The largest thing on the first screen: loaded at once. */
  priority?: boolean;
  decorative?: boolean;
  className?: string;
}) {
  const photo = PHOTOS[id];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- see above
    <img
      src={file(id, 1280)}
      srcSet={`${file(id, 640)} 640w, ${file(id, 1280)} 1280w`}
      sizes={sizes}
      width={photo.width}
      height={photo.height}
      alt={decorative ? "" : photo.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("object-cover", className)}
    />
  );
}

/** "Fotoğraf: Jannis Brandt / Unsplash", leading to the photo's page. */
export function PhotoCredit({ id, className }: { id: PhotoId; className?: string }) {
  const photo = PHOTOS[id];
  return (
    <a
      href={photo.source}
      rel="noopener noreferrer"
      className={cn("type-meta no-underline hover:underline", className)}
    >
      {format(t.photo.credit, { author: photo.author })}
    </a>
  );
}

/** A photo shown large (a cover, an article's picture) with its photographer beneath. */
export function PhotoFigure({
  id,
  sizes,
  priority,
  className,
}: {
  id: PhotoId;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div className="aspect-video overflow-hidden rounded-lg bg-sunk">
        <PhotoImage
          id={id}
          sizes={sizes}
          priority={priority}
          className="size-full motion-safe:animate-settle"
        />
      </div>
      <figcaption>
        <PhotoCredit id={id} />
      </figcaption>
    </figure>
  );
}
