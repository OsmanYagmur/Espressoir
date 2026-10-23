import { cardClass } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Field {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  /** Shown faded: the field has nothing to report yet. */
  empty?: boolean;
}

/** A few headline figures side by side, each in its own card: label, number, a note. */
export function FieldStrip({ fields, className }: { fields: Field[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-4",
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
          className={cn(cardClass, "flex flex-col gap-1 max-md:last:odd:col-span-2")}
        >
          <dt className="type-label text-ink-2">{field.label}</dt>
          <dd
            className={cn(
              "font-mono text-4xl/8 font-medium tabular-nums",
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
