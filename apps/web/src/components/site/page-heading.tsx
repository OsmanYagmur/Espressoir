import { cn } from "@/lib/utils";

/**
 * The page title, set like the heading of a form. `kicker` is the small label above it
 * and may hold links. Titles made of product names pass `plain` so they are not uppercased
 * (CSS uppercasing under lang="tr" would turn "i" into "İ").
 */
export function PageHeading({
  title,
  kicker,
  aside,
  plain = false,
  className,
}: {
  title: string;
  kicker?: React.ReactNode;
  aside?: React.ReactNode;
  plain?: boolean;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "grid gap-5 border-b border-rule pt-9 pb-6 md:grid-cols-[1fr_auto] md:items-end",
        className,
      )}
    >
      <div>
        {kicker ? <div className="label-caps mb-1.5 text-muted-foreground">{kicker}</div> : null}
        <h1
          className={cn(
            "font-wide leading-[0.9] font-extrabold tracking-[-0.03em]",
            plain
              ? "text-[clamp(2.25rem,6.5vw,5rem)] [overflow-wrap:anywhere]"
              : "text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.86] uppercase",
          )}
        >
          {title}
          <span className="text-brand">.</span>
        </h1>
      </div>
      {aside ? (
        <div className="max-w-sm font-mono text-xs leading-relaxed text-muted-foreground md:text-right">
          {aside}
        </div>
      ) : null}
    </header>
  );
}
