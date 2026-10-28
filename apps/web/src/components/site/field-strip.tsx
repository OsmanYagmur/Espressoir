import { cn } from "@/lib/utils";

export interface Field {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  /** Shown faded: the field has nothing to report yet. */
  empty?: boolean;
}

/**
 * A few headline figures side by side in one frame, hairlines between them: label, number,
 * a note. One frame rather than a card per figure, so they read as one summary.
 */
export function FieldStrip({ fields, className }: { fields: Field[]; className?: string }) {
  return (
    <dl
      className={cn(
        // The 1px gaps show the frame's colour through: the lines between the figures.
        "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line",
        fields.length >= 5
          ? "md:grid-cols-5"
          : fields.length === 3
            ? "md:grid-cols-3"
            : "md:grid-cols-4",
        className,
      )}
    >
      {fields.map((field) => (
        <div
          key={field.label}
          // On a phone the figures sit two to a row; an odd one out takes the whole row.
          className="flex flex-col gap-1 bg-surface p-4 max-md:last:odd:col-span-2 md:p-6"
        >
          <dt className="type-label text-ink-2">{field.label}</dt>
          <dd
            className={cn(
              "text-4xl/8 font-semibold tracking-tight tabular-nums",
              field.empty && "text-ink-3",
            )}
          >
            {field.value}
          </dd>
          {field.note ? <dd className="type-meta">{field.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
