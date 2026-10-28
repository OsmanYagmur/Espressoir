import { CheckIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

const chipBase =
  "relative inline-flex items-center gap-1 rounded-full text-sm font-medium whitespace-nowrap";

const CHIP_TONES = {
  info: "bg-sunk text-ink",
  note: "bg-accent-soft text-accent-ink",
  method: "bg-sage-soft text-sage-ink",
} as const;

/**
 * Chip (DESIGN.md): a piece of information (origin, form); `note` is a flavour note,
 * `method` a brewing method (the sage, the second accent).
 */
function Chip({
  variant = "info",
  className,
  ...props
}: React.ComponentProps<"span"> & { variant?: keyof typeof CHIP_TONES }) {
  return <span className={cn(chipBase, "h-7 px-3", CHIP_TONES[variant], className)} {...props} />;
}

/**
 * A chip that is a button and stays pressed while its choice is on (aria-pressed): a filter
 * or a choice. Pressed, it turns sage and gains a tick, so the state never rests on colour.
 */
function ToggleChip({ className, children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        chipBase,
        "group/chip h-10 cursor-pointer border border-line-strong bg-surface px-4 text-ink transition-colors hover:bg-sunk aria-pressed:border-sage-ink aria-pressed:bg-sage-soft aria-pressed:text-sage-ink",
        className,
      )}
      {...props}
    >
      <CheckIcon
        aria-hidden
        className="-ml-1 hidden size-4 stroke-2 group-aria-pressed/chip:block"
      />
      {children}
    </button>
  );
}

/** A row of chips; it wraps on a narrow screen. */
function Chips({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-wrap gap-2", className)} {...props} />;
}

export { Chip, Chips, ToggleChip };
