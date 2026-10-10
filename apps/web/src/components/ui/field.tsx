import type * as React from "react";

import { cn } from "@/lib/utils";

// Form controls in the tasting-form style: ruled boxes, mono text, no rounding.
// 16px text on small screens keeps iOS from zooming into a focused field.
const control =
  "w-full border border-input bg-background px-3 font-mono text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus-visible:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("label-caps block text-muted-foreground", className)} {...props} />;
}

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn(control, "h-11", className)} {...props} />;
}

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="select" className={cn(control, "h-11 pr-8", className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(control, "min-h-32 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

/** A label stacked over its control, with an optional hint or error underneath. */
function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="font-mono text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="font-mono text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export { Field, Input, Label, Select, Textarea };
