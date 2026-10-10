import { t } from "@/lib/i18n";

/**
 * The table twin of a chart: the same numbers, readable without seeing or hovering the
 * plot. Collapsed by default so it does not compete with the chart.
 */
export function DataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: readonly string[];
  rows: readonly (readonly (string | number)[])[];
}) {
  return (
    <details className="mt-3 font-mono text-xs">
      <summary className="cursor-pointer text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        {t.stats.tableToggle}
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-left tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-rule">
              {columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={
                    index === 0 ? "py-1.5 pr-3 font-medium" : "px-3 py-1.5 text-right font-medium"
                  }
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border">
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row" className="py-1.5 pr-3 font-normal">
                      {cell}
                    </th>
                  ) : (
                    <td key={index} className="px-3 py-1.5 text-right">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
