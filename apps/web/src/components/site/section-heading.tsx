import { cn } from "@/lib/utils";

/**
 * A section's heading: an optional line above it saying where it belongs, a short sentence
 * in the title style, an optional link or note on the right ("Tümünü gör") and an optional
 * sentence under it saying what the section holds.
 */
export function SectionHeading({
  title,
  kicker,
  aside,
  hint,
  id,
  level = 2,
  className,
}: {
  title: string;
  kicker?: React.ReactNode;
  aside?: React.ReactNode;
  hint?: React.ReactNode;
  id?: string;
  /** h3 for a section inside a section, set in the card-title style. */
  level?: 2 | 3;
  className?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className={cn("mb-6 flex flex-col gap-2", className)}>
      {kicker ? <p className="type-kicker">{kicker}</p> : null}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Heading id={id} className={level === 2 ? "type-title" : "type-card-title"}>
          {title}
        </Heading>
        {aside ? <div className="type-meta">{aside}</div> : null}
      </div>
      {hint ? <p className="max-w-read type-meta">{hint}</p> : null}
    </div>
  );
}

/** A section of a page, spaced from the one before it (48px, 80px from 768px). */
export function Section({
  id,
  className,
  children,
}: {
  /** The id of its heading, which names the section. */
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className={cn("mt-12 md:mt-20", className)}>
      {children}
    </section>
  );
}
