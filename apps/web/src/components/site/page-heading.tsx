import { cn } from "@/lib/utils";

/**
 * The top of a page: an optional line above (where the page sits), the title, one lead
 * sentence saying what the page is for, and whatever belongs beside them (an action).
 * The title is `display` (DESIGN.md: once per page) unless `size="title"` asks for the
 * smaller style, as working pages (forms, settings) do.
 */
export function PageHeading({
  title,
  lead,
  kicker,
  size = "display",
  children,
  className,
}: {
  title: React.ReactNode;
  lead?: React.ReactNode;
  kicker?: React.ReactNode;
  size?: "display" | "title";
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-3 pb-8", className)}>
      {kicker ? <div className="type-meta">{kicker}</div> : null}
      <h1
        className={cn(
          "[overflow-wrap:anywhere]",
          size === "display" ? "type-display" : "type-title",
        )}
      >
        {title}
      </h1>
      {lead ? <p className="max-w-read type-lead">{lead}</p> : null}
      {children ? <div className="mt-2 flex flex-wrap items-center gap-4">{children}</div> : null}
    </header>
  );
}
