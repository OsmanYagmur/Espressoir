import Link from "next/link";

import { ScoreBadge } from "@/components/coffee/score-badge";
import type { CafeCard } from "@/lib/data/cafes";
import { format, t } from "@/lib/i18n";

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * Cafés as ruled rows: where, how often visited, the average. Rendered on the server for
 * the static page and again in the browser when filters change, so it stays free of
 * server-only code.
 */
export function CafeList({
  cafes,
  heading: Heading = "h3",
  label,
}: {
  cafes: readonly CafeCard[];
  /** The level that fits the page outline: "h2" when the list hangs directly under the title. */
  heading?: "h2" | "h3";
  label: string;
}) {
  return (
    <ul aria-label={label}>
      {cafes.map((cafe) => (
        <li
          key={cafe.id}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-border py-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto]"
        >
          <div className="min-w-0">
            <p className="py-1 font-mono text-xs text-muted-foreground">{cafe.place}</p>
            <Heading className="font-semiwide text-lg leading-snug font-bold [overflow-wrap:anywhere]">
              {/* Café names keep their own spelling: no CSS uppercasing anywhere. */}
              <Link href={cafe.href} className={linkFocus}>
                {cafe.name}
              </Link>
              {cafe.isReviewed ? null : (
                <span className="label-caps ml-2 border border-dashed border-input px-1.5 py-0.5 align-middle font-mono text-xs font-normal text-muted-foreground">
                  {t.cafes.unreviewed}
                </span>
              )}
            </Heading>
          </div>
          <p className="font-mono text-xs text-muted-foreground max-md:order-last max-md:col-span-2 md:text-right">
            {cafe.visitCount === 0
              ? t.cafes.noVisits
              : [format(t.cafes.visitCount, { count: cafe.visitCount }), cafe.lastVisitLabel]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
          <ScoreBadge score={cafe.avgScore} />
        </li>
      ))}
    </ul>
  );
}
