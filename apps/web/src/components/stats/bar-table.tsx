/**
 * Counts as bars from zero inside a table: the label, the bar and the number are all
 * printed, so the table is its own text version. One series, in ink-2.
 */
export function BarTable({
  rows,
  caption,
}: {
  rows: readonly { key: string; label: React.ReactNode; value: number; display?: string }[];
  caption: string;
}) {
  const most = Math.max(...rows.map((row) => row.value), 1);
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-line">
            <th
              scope="row"
              className="w-[40%] py-2 pr-3 text-left text-base font-medium [overflow-wrap:anywhere]"
            >
              {row.label}
            </th>
            <td className="py-2">
              <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-sunk">
                <span
                  className="block h-full origin-left rounded-full bg-ink-2 motion-safe:animate-fill motion-safe:animate-delay-150"
                  style={{ width: `${(row.value / most) * 100}%` }}
                />
              </span>
            </td>
            <td className="w-24 py-2 pl-3 text-right type-figure">{row.display ?? row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
