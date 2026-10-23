import { TASTE_MAX, type TasteDimension } from "@espressoir/core";

import { formatDecimal } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** The order DESIGN.md lists them in; aftertaste, which the form also asks, comes last. */
const ORDER: readonly TasteDimension[] = [
  "body",
  "acidity",
  "sweetness",
  "bitterness",
  "aftertaste",
];

export interface TasteRow {
  dimension: TasteDimension;
  /** 1–5: one tasting's value, or the mean of several; null where nobody gave one. */
  value: number | null;
  /** For a mean: how many tastings gave this dimension a value. */
  n?: number;
  /** For a mean: too few tastings to read much into it. */
  small?: boolean;
}

/** 1–2 → the low word, 3 → the middle one, 4–5 → the high one ("Hafif", "Orta", "Yoğun"). */
function wordFor(dimension: TasteDimension, value: number): string {
  const rounded = Math.round(value);
  return t.taste.words[dimension][rounded <= 2 ? 0 : rounded === 3 ? 1 : 2] ?? "";
}

/**
 * TasteProfile (DESIGN.md): each dimension as five dots and the word for it. One tasting's
 * profile or the average of several (then with the mean and its n). Dimensions without a
 * value are left out; with none at all it renders nothing.
 */
export function TasteProfile({
  rows,
  className,
}: {
  rows: readonly TasteRow[];
  className?: string;
}) {
  const shown = ORDER.flatMap((dimension) => {
    const row = rows.find((candidate) => candidate.dimension === dimension);
    return row && row.value !== null ? [{ ...row, value: row.value }] : [];
  });
  if (shown.length === 0) return null;

  return (
    <dl className={cn("grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3", className)}>
      {shown.map(({ dimension, value, n, small }) => {
        const name = t.panel.form.taste[dimension];
        const word = wordFor(dimension, value);
        const spoken = word.toLocaleLowerCase("tr");
        const mean = n === undefined ? null : formatDecimal(value);
        const label =
          mean === null
            ? format(t.taste.rowLabel, { name, value, max: TASTE_MAX, word: spoken })
            : format(t.taste.meanRowLabel, { name, mean, max: TASTE_MAX, word: spoken, n: n ?? 0 });
        const filled = Math.round(value);
        return (
          <div
            key={dimension}
            role="img"
            aria-label={label}
            className="col-span-3 grid grid-cols-subgrid items-center"
          >
            <dt className="type-label text-ink">{name}</dt>
            <dd className={cn("flex gap-1", small && "opacity-50")}>
              {Array.from({ length: TASTE_MAX }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-2 max-w-10 flex-1 rounded-full border",
                    index < filled ? "border-accent bg-accent" : "border-line-strong bg-sunk",
                  )}
                />
              ))}
            </dd>
            <dd className="min-w-16 text-right type-meta">
              {word}
              {mean === null ? null : (
                <span className="type-figure">
                  {" "}
                  · {format(t.taste.meanValue, { mean, n: n ?? 0 })}
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
