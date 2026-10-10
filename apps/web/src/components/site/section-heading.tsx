import { cn } from "@/lib/utils";

/** Numbered form-section heading: "01 — Son tadımlar", with an optional note on the right. */
export function SectionHeading({
  index,
  title,
  aside,
  id,
  className,
}: {
  index: number;
  title: string;
  aside?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={cn(
        "flex items-baseline justify-between gap-4 border-b border-rule pt-4 pb-2.5 font-mono text-xs font-semibold tracking-wide uppercase",
        className,
      )}
    >
      <span>
        {String(index).padStart(2, "0")} — {title}
      </span>
      {aside ? <span className="font-medium text-muted-foreground">{aside}</span> : null}
    </h2>
  );
}
