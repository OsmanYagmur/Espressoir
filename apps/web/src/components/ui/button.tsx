import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Button (DESIGN.md): `primary` is the one main action of a screen, `secondary` every other
 * action, `text` an inline link. `sm` only for the header's sign-in. A button that changes
 * the page is an <a> (`asChild` around a Link), one that does something is a <button>.
 * Disabled, its label says why ("Kontenjan doldu").
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent font-semibold whitespace-nowrap no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-on-accent hover:bg-accent-ink disabled:hover:bg-accent aria-disabled:hover:bg-accent",
        secondary:
          "border-line-strong bg-transparent text-ink hover:bg-sunk disabled:hover:bg-transparent",
        text: "border-0 bg-transparent text-accent-ink underline underline-offset-3",
      },
      size: {
        md: "h-12 px-6 text-base/5",
        sm: "h-9 px-4 text-sm",
      },
      block: {
        true: "flex w-full",
        false: "",
      },
    },
    compoundVariants: [{ variant: "text", className: "h-auto px-0" }],
    defaultVariants: {
      variant: "primary",
      size: "md",
      block: false,
    },
  },
);

function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
