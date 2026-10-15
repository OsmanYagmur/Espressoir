import Link from "next/link";

import { cn } from "@/lib/utils";

import { ScoreBadge } from "./score-badge";

const linkFocus =
  "underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

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
 * Suggested coffees as ruled rows: brand, name, the reason, the community's average.
 * Links are not fetched ahead: this page sits in the signed-in area, where saves refresh
 * the archive (see lib/data/refresh-archive.ts).
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
    <ol aria-label={label} className={className}>
      {rows.map((row) => (
        <li
          key={row.coffeeId}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border py-3.5"
        >
          <div className="min-w-0">
            <p className="py-1 font-mono text-xs text-muted-foreground">{row.brandName}</p>
            <h3 className="font-semiwide text-lg leading-snug font-bold [overflow-wrap:anywhere]">
              <Link href={row.href} prefetch={false} className={cn(linkFocus)}>
                {row.coffeeName}
              </Link>
            </h3>
            <p className="mt-1 font-mono text-xs">{row.reason}</p>
          </div>
          <ScoreBadge score={row.avgScore} />
        </li>
      ))}
    </ol>
  );
}
