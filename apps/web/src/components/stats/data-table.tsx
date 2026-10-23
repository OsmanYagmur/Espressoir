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
    <details className="mt-4 text-sm">
      <summary className="cursor-pointer text-accent-ink underline underline-offset-3">
        {t.stats.tableToggle}
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line-strong">
              {columns.map((column, index) => (
                <th
                  key={column}
                  scope="col"
                  className={
                    index === 0 ? "py-2 pr-3 font-semibold" : "px-3 py-2 text-right font-semibold"
                  }
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-line">
                {row.map((cell, index) =>
                  index === 0 ? (
                    <th key={index} scope="row" className="py-2 pr-3 font-normal">
                      {cell}
                    </th>
                  ) : (
                    <td key={index} className="px-3 py-2 text-right type-figure">
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
