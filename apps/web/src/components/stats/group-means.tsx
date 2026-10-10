import { SCORE_MAX, SCORE_MIN, type GroupSummary } from "@espressoir/core";
import type { Route } from "next";
import Link from "next/link";

import { formatDecimal } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SPAN = SCORE_MAX - SCORE_MIN;
const position = (score: number) => `${((score - SCORE_MIN) / SPAN) * 100}%`;
const ticks = Array.from({ length: SPAN + 1 }, (_, i) => SCORE_MIN + i);

export interface GroupRow extends GroupSummary {
  label: string;
  href?: Route;
}

/**
 * Average score per group as a dot plot inside a table: the square marks the mean, the
 * line runs from the lowest to the highest score. Means on a 1–10 scale are positions,
 * not lengths, so they are not drawn as bars from zero.
 *
 * Being a real table, it is its own table view: label, n and mean are always printed.
 * Groups with fewer than three tastings are faded, drawn hollow and tagged, so the
 * warning does not depend on colour.
 */
export function GroupMeans({
  caption,
  groupLabel,
  rows,
}: {
  caption: string;
  groupLabel: string;
  rows: readonly GroupRow[];
}) {
  return (
    <table className="w-full border-collapse font-mono text-xs">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-border text-muted-foreground">
          <th scope="col" className="py-2 pr-3 text-left font-medium">
            {groupLabel}
          </th>
          <th scope="col" className="w-10 px-2 py-2 text-right font-medium">
            {t.stats.columns.n}
          </th>
          <th scope="col" className="w-[46%] px-3 py-2 font-normal sm:w-[52%]">
            <span className="sr-only">{t.stats.axis.score}</span>
            <span aria-hidden className="relative block h-4">
              {ticks.map((tick) => (
                <span
                  key={tick}
                  className={cn(
                    "absolute top-0 -translate-x-1/2 tabular-nums",
                    tick % 3 !== 1 && "max-sm:hidden",
                  )}
                  style={{ left: position(tick) }}
                >
                  {tick}
                </span>
              ))}
            </span>
          </th>
          <th scope="col" className="w-14 py-2 pl-2 text-right font-medium">
            {t.stats.columns.mean}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.key}
            className={cn(
              "border-b border-border hover:bg-muted/60",
              row.small && "text-muted-foreground",
            )}
          >
            <th scope="row" className="py-2.5 pr-3 text-left font-sans text-sm font-semibold">
              {row.href ? (
                <Link
                  href={row.href}
                  className="underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {row.label}
                </Link>
              ) : (
                row.label
              )}
              {row.small ? (
                <span className="label-caps ml-2 border border-dashed border-input px-1 py-px align-middle font-normal whitespace-nowrap">
                  {t.stats.smallSample}
                </span>
              ) : null}
            </th>
            <td className="px-2 py-2.5 text-right tabular-nums">{row.n}</td>
            <td
              className="px-3 py-2.5"
              title={format(t.stats.tooltip.group, {
                label: row.label,
                mean: formatDecimal(row.mean!),
                n: row.n,
              })}
            >
              {/* Hairlines at every whole score; the last one is the right border. */}
              <span
                aria-hidden
                className="relative block h-4 border-r border-border bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px)] bg-[length:calc(100%/9)_100%]"
              >
                {row.min !== row.max ? (
                  <span
                    className={cn(
                      "absolute top-1/2 h-0.5 -translate-y-1/2",
                      row.small ? "bg-muted-foreground/60" : "bg-foreground",
                    )}
                    style={{
                      left: position(row.min!),
                      right: `calc(100% - ${position(row.max!)})`,
                    }}
                  />
                ) : null}
                <span
                  className={cn(
                    "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 ring-2 ring-background",
                    row.small ? "border-2 border-muted-foreground bg-background" : "bg-foreground",
                  )}
                  style={{ left: position(row.mean!) }}
                />
              </span>
            </td>
            <td className="py-2.5 pl-2 text-right text-sm font-medium tabular-nums">
              {formatDecimal(row.mean!)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
