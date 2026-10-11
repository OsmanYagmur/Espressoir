import { cn } from "@/lib/utils";

// A glyph of the wide display face is about 0.84em wide (capitals a little more), and the
// column is the viewport minus its gutters: a word of n characters fits on one line up to
// about (100 / n)vw, or (86 / n)vw in capitals.
const LONG_WORD = 10;

/**
 * The page title, set like the heading of a form. `kicker` is the small label above it
 * and may hold links. Titles made of product names pass `plain` so they are not uppercased
 * (CSS uppercasing under lang="tr" would turn "i" into "İ"). With `fit`, a title holding a
 * long unbreakable word (a username) is set smaller, so the word stays whole on a phone.
 */
export function PageHeading({
  title,
  kicker,
  aside,
  plain = false,
  fit = false,
  className,
}: {
  title: string;
  kicker?: React.ReactNode;
  aside?: React.ReactNode;
  plain?: boolean;
  fit?: boolean;
  className?: string;
}) {
  // +1 for the full stop that follows the title.
  const longestWord = Math.max(...title.split(/\s+/).map((word) => word.length)) + 1;
  const fitted =
    fit && longestWord > LONG_WORD
      ? {
          fontSize: plain
            ? `clamp(1.25rem, ${(100 / longestWord).toFixed(2)}vw, 5rem)`
            : `clamp(1.25rem, ${(86 / longestWord).toFixed(2)}vw, 6.5rem)`,
        }
      : undefined;

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
          style={fitted}
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
