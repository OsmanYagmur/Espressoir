import Link from "next/link";

import { ScoreBadge } from "@/components/coffee/score-badge";
import { Chip } from "@/components/ui/chip";
import type { CafeCard } from "@/lib/data/cafes";
import { format, t } from "@/lib/i18n";

/**
 * Cafés as rows, each a single link: where, how often visited, the average. Rendered on
 * the server for the static page and again in the browser when filters change, so it
 * stays free of server-only code.
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
    <ul aria-label={label} className="border-t border-line">
      {cafes.map((cafe) => (
        <li key={cafe.id} className="border-b border-line">
          <Link
            href={cafe.href}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 text-ink no-underline transition-colors hover:bg-sunk md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] md:px-2"
          >
            <div className="min-w-0">
              <Heading className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-xl font-semibold [overflow-wrap:anywhere]">
                {cafe.name}
                {cafe.isReviewed ? null : <Chip className="font-sans">{t.cafes.unreviewed}</Chip>}
              </Heading>
              <p className="type-meta">{cafe.place}</p>
            </div>
            <p className="type-meta max-md:order-last max-md:col-span-2 md:text-right">
              {cafe.visitCount === 0
                ? t.cafes.noVisits
                : [format(t.cafes.visitCount, { count: cafe.visitCount }), cafe.lastVisitLabel]
                    .filter(Boolean)
                    .join(" · ")}
            </p>
            <ScoreBadge score={cafe.avgScore} size="sm" empty={t.score.emptyCoffee} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
