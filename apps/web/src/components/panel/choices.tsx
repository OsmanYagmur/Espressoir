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
    <fieldset className="grid gap-1.5">
      <legend className="label-caps mb-1.5 text-muted-foreground">{legend}</legend>
      <div className={cn("grid gap-1.5", columns)}>
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
            <span className="grid h-11 cursor-pointer place-items-center border border-input px-2 text-center font-mono text-sm peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
