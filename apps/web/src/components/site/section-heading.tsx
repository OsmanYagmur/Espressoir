import { cn } from "@/lib/utils";

/**
 * Numbered form-section heading: "01 — Son tadımlar", with an optional note on the right.
 * `hint` is a sentence about what the section holds; only the sade look prints it.
 */
export function SectionHeading({
  index,
  title,
  aside,
  hint,
  id,
  className,
}: {
  index: number;
  title: string;
  aside?: React.ReactNode;
  hint?: string;
  id?: string;
  className?: string;
}) {
  const heading = (
    <h2
      id={id}
      className={cn(
        "flex items-baseline justify-between gap-4 border-b border-rule pt-4 pb-2.5 font-mono text-xs font-medium tracking-wide uppercase",
        // Sade: sections are set apart by space and a heavier line, so the eye finds them.
        "sade:border-b-2 sade:pt-7 sade:text-[0.8125rem]",
        className,
      )}
    >
      <span>
        <span className="sade:text-muted-foreground">{String(index).padStart(2, "0")} — </span>
        {title}
      </span>
      {aside ? (
        <span className="font-medium tracking-normal text-muted-foreground normal-case">
          {aside}
        </span>
      ) : null}
    </h2>
  );
  if (!hint) return heading;

  return (
    <>
      {heading}
      <p className="max-w-[62ch] pt-2.5 text-sm text-muted-foreground form:hidden">{hint}</p>
    </>
  );
}
