import { formatLongDay } from "@/lib/format";

import { DataTable } from "./data-table";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every day from the first to the last given, the missing ones at zero. */
function continuous(days: readonly { day: string; count: number }[]) {
  const counts = new Map(days.map(({ day, count }) => [day, count]));
  const sorted = [...counts.keys()].sort();
  const [first, last] = [sorted[0], sorted.at(-1)];
  if (!first || !last) return [];
  const all: { day: string; count: number }[] = [];
  for (let time = Date.parse(first); time <= Date.parse(last); time += DAY_MS) {
    const day = new Date(time).toISOString().slice(0, 10);
    all.push({ day, count: counts.get(day) ?? 0 });
  }
  return all;
}

/**
 * Counts per day as thin columns, quiet days in place as gaps; the first and last day
 * under them, every day's count in its label and in the table twin.
 */
export function DayColumns({
  days,
  caption,
  label,
  columns,
}: {
  days: readonly { day: string; count: number }[];
  caption: string;
  /** "22 Kasım Pazar: 3 başvuru" for one day. */
  label: (day: string, count: number) => string;
  /** The table twin's headings: the day, the count. */
  columns: readonly [string, string];
}) {
  const all = continuous(days);
  const max = Math.max(1, ...all.map(({ count }) => count));
  const [first, last] = [all[0], all.at(-1)];
  if (!first || !last) return null;

  return (
    <div>
      <ol aria-label={caption} className="flex h-32 items-end gap-0.5 border-b border-line-strong">
        {all.map(({ day, count }) => {
          const text = label(formatLongDay(day), count);
          return (
            <li key={day} title={text} className="flex h-full max-w-6 flex-1 flex-col justify-end">
              <span className="sr-only">{text}</span>
              <span
                aria-hidden
                className="w-full origin-bottom rounded-t-sm bg-ink-2 motion-safe:animate-rise"
                style={{ height: `${(count / max) * 90}%` }}
              />
            </li>
          );
        })}
      </ol>
      <p aria-hidden className="mt-2 flex justify-between type-figure text-ink-2">
        <span>{formatLongDay(first.day)}</span>
        {last.day === first.day ? null : <span>{formatLongDay(last.day)}</span>}
      </p>
      <DataTable
        caption={caption}
        columns={columns}
        rows={all.map(({ day, count }) => [formatLongDay(day), count])}
      />
    </div>
  );
}
