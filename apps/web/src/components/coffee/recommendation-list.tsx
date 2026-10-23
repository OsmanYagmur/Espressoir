import Link from "next/link";

import { cn } from "@/lib/utils";

import { ScoreBadge } from "./score-badge";

export interface RecommendationRow {
  coffeeId: string;
  href: React.ComponentProps<typeof Link>["href"];
  brandName: string;
  coffeeName: string;
  /** Why it is suggested, in words. */
  reason: string;
  /** The community's average, shown beside it. */
  avgScore: number | null;
}

/**
 * Suggested coffees as rows, each a single link: the name, the roaster, the reason, the
 * community's average. Links are not fetched ahead: this page sits in the signed-in
 * area, where saves refresh the archive (see lib/data/refresh-archive.ts).
 */
export function RecommendationList({
  rows,
  label,
  className,
}: {
  rows: readonly RecommendationRow[];
  label: string;
  className?: string;
}) {
  return (
    <ol aria-label={label} className={cn("border-t border-line", className)}>
      {rows.map((row) => (
        <li key={row.coffeeId} className="border-b border-line">
          <Link
            href={row.href}
            prefetch={false}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4 text-ink no-underline transition-colors hover:bg-sunk md:px-2"
          >
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold [overflow-wrap:anywhere]">
                {row.coffeeName}
              </h3>
              <p className="type-meta">{row.brandName}</p>
              <p className="mt-1">{row.reason}</p>
            </div>
            <ScoreBadge score={row.avgScore} size="sm" />
          </Link>
        </li>
      ))}
    </ol>
  );
}
