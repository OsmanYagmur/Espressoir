import { cn } from "@/lib/utils";

/** A row of mutually exclusive choices drawn as boxes (large enough to tap with a thumb). */
export function Choices({
  name,
  legend,
  options,
  value,
  onChange,
  defaultValue,
  columns,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  /** Controlled (with onChange) when other fields depend on the choice. */
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  columns: string;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 type-label">{legend}</legend>
      <div className={cn("grid gap-2", columns)}>
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              className="peer sr-only"
              {...(onChange
                ? { checked: value === option.value, onChange: () => onChange(option.value) }
                : { defaultChecked: defaultValue === option.value })}
            />
            <span className="grid h-12 cursor-pointer place-items-center rounded-md border border-line-strong bg-surface px-2 text-center transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
