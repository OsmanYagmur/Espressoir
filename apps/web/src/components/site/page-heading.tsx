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
 *
 * `lead` is one plain sentence saying what the page is for. The sade look prints it under
 * the title, in place of the small `aside` note; the form look keeps the aside.
 */
export function PageHeading({
  title,
  kicker,
  aside,
  lead,
  plain = false,
  fit = false,
  className,
}: {
  title: string;
  kicker?: React.ReactNode;
  aside?: React.ReactNode;
  lead?: React.ReactNode;
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
            // Sade: the title leads the page without drowning what is under it.
            plain
              ? "text-[clamp(2.25rem,6.5vw,5rem)] [overflow-wrap:anywhere] sade:text-[clamp(2rem,5.2vw,3.75rem)]"
              : "text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.86] uppercase sade:text-[clamp(2.25rem,6vw,4.5rem)] sade:leading-[0.9]",
          )}
        >
          {title}
          <span className="text-brand">.</span>
        </h1>
        {lead ? (
          <p className="mt-4 max-w-[58ch] text-[1.05rem] leading-relaxed form:hidden">{lead}</p>
        ) : null}
      </div>
      {aside ? (
        <div
          className={cn(
            "max-w-sm font-mono text-xs leading-relaxed text-muted-foreground md:text-right",
            lead && "sade:hidden",
          )}
        >
          {aside}
        </div>
      ) : null}
    </header>
  );
}
