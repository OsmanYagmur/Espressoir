import type * as React from "react";

import { cn } from "@/lib/utils";

// 16px text keeps iOS from zooming into a focused field.
const control =
  "w-full rounded-md border border-line-strong bg-surface px-4 text-base text-ink transition-colors placeholder:text-ink-3 disabled:opacity-50 aria-invalid:border-danger";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("block type-label text-ink", className)} {...props} />;
}

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input data-slot="input" className={cn(control, "h-12", className)} {...props} />;
}

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select data-slot="select" className={cn(control, "h-12 pr-8", className)} {...props} />;
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(control, "min-h-24 resize-y py-3", className)}
      {...props}
    />
  );
}

/** The help or error line under a control; the error replaces the help. */
function FieldNote({ id, error, hint }: { id: string; error?: string; hint?: React.ReactNode }) {
  if (error) {
    return (
      <p id={`${id}-error`} className="text-sm font-medium text-danger">
        {error}
      </p>
    );
  }
  if (!hint) return null;
  return (
    <p id={`${id}-hint`} className="type-meta">
      {hint}
    </p>
  );
}

/** Where a control's help or error line is, for its aria-describedby. */
function describedBy(id: string, { error, hint }: { error?: string; hint?: unknown }) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

/** A label over its control, with an optional help sentence or error underneath. */
function Field({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  hint?: React.ReactNode;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <FieldNote id={htmlFor} error={error} hint={hint} />
    </div>
  );
}

/** The "(isteğe bağlı)" after a label. */
function Optional({ children }: { children: React.ReactNode }) {
  return <span className="font-normal text-ink-2">{children}</span>;
}

export { describedBy, Field, FieldNote, Input, Label, Optional, Select, Textarea };
