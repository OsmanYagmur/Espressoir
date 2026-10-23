import type * as React from "react";

import { cn } from "@/lib/utils";

const chipBase =
  "relative inline-flex items-center gap-1 rounded-full text-sm font-medium whitespace-nowrap";

/** Chip (DESIGN.md): a piece of information (method, origin); `note` is a flavour note. */
function Chip({
  variant = "info",
  className,
  ...props
}: React.ComponentProps<"span"> & { variant?: "info" | "note" }) {
  return (
    <span
      className={cn(
        chipBase,
        "h-7 px-3",
        variant === "note" ? "bg-accent-soft text-accent-ink" : "bg-sunk text-ink",
        className,
      )}
      {...props}
    />
  );
}

/**
 * A chip that can be ticked, for picking several things in a form: a <label> around a
 * hidden checkbox (or radio), filled with ink once chosen.
 */
function SelectChip({
  children,
  className,
  ...input
}: Omit<React.ComponentProps<"input">, "type"> & { type?: "checkbox" | "radio" }) {
  return (
    <label
      className={cn(
        chipBase,
        "h-10 cursor-pointer border border-line-strong bg-surface px-4 text-ink transition-colors has-checked:border-ink has-checked:bg-ink has-checked:text-bg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus has-disabled:cursor-not-allowed has-disabled:opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        className="pointer-events-none absolute size-px opacity-0 focus-visible:outline-none"
        {...input}
      />
      {children}
    </label>
  );
}

/** A chip that is a button and stays pressed while its choice is on (aria-pressed). */
function ToggleChip({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        chipBase,
        "h-10 cursor-pointer border border-line-strong bg-surface px-4 text-ink transition-colors aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg",
        className,
      )}
      {...props}
    />
  );
}

/** A row of chips; it wraps on a narrow screen. */
function Chips({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

export { Chip, Chips, SelectChip, ToggleChip };
