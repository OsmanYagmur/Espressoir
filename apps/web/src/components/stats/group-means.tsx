import { SCORE_MAX, type GroupSummary } from "@espressoir/core";
import type { Route } from "next";
import Link from "next/link";

import { formatDecimal } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface GroupRow extends GroupSummary {
  label: string;
  href?: Route;
}

/**
 * Average score per group, inside a table: the name, n, and the mean as a number with
 * one bar (the mean × 10 %), like every score on the site. Being a real table, it is its
 * own table view. Groups with fewer than three tastings are faded and tagged, so the
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
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-line-strong text-left">
          <th scope="col" className="py-2 pr-3 font-semibold">
            {groupLabel}
          </th>
          <th scope="col" className="w-12 px-2 py-2 text-right font-semibold">
            {t.stats.columns.n}
          </th>
          <th scope="col" className="w-[40%] py-2 pl-3 font-semibold">
            {t.stats.columns.mean}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className={cn("border-b border-line", row.small && "text-ink-2")}>
            <th scope="row" className="py-3 pr-3 text-left text-base font-semibold">
              {row.href ? (
                <Link href={row.href} className="text-ink underline-offset-3 hover:underline">
                  {row.label}
                </Link>
              ) : (
                row.label
              )}
              {row.small ? (
                <span className="ml-2 inline-block rounded-full bg-sunk px-2 align-middle text-sm font-medium text-ink-2">
                  {t.stats.smallSample}
                </span>
              ) : null}
            </th>
            <td className="px-2 py-3 text-right type-figure">{row.n}</td>
            <td
              className="py-3 pl-3"
              title={format(t.stats.tooltip.group, {
                label: row.label,
                mean: formatDecimal(row.mean!),
                n: row.n,
              })}
            >
              <span className="flex items-center gap-3">
                <span className="w-9 type-figure">{formatDecimal(row.mean!)}</span>
                <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-sunk">
                  <span
                    className={cn("block h-full rounded-full bg-accent", row.small && "opacity-50")}
                    style={{ width: `${(row.mean! / SCORE_MAX) * 100}%` }}
                  />
                </span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
