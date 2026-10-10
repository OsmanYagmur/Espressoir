import { cn } from "@/lib/utils";

export interface Field {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  /** Shown faded: the field has nothing to report yet. */
  empty?: boolean;
}

/**
 * A row of labelled fields, like the header boxes of a tasting form. The 1px gaps over an
 * ink background draw the rules between the fields.
 */
export function FieldStrip({ fields, className }: { fields: Field[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px border-b border-rule bg-rule",
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
          className="bg-background px-3.5 pt-3 pb-3.5 max-md:odd:pl-0 md:first:pl-0"
        >
          <dt className="label-caps text-muted-foreground">{field.label}</dt>
          <dd
            className={cn(
              "mt-1 text-[clamp(1.75rem,3.6vw,2.5rem)] leading-tight font-bold",
              field.empty && "text-muted-foreground/50",
            )}
          >
            {field.value}
          </dd>
          {field.note ? (
            <dd className="font-mono text-xs text-muted-foreground">{field.note}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
