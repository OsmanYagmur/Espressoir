import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * EmptyState (DESIGN.md): what a list says when it has nothing to show. A short sentence on
 * why, one on what to do next, and the way there (a button or a link). A dashed line marks
 * the place the content will fill; there is no card around it.
 */
export function EmptyState({
  title,
  body,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  body?: React.ReactNode;
  icon?: LucideIcon;
  /** The next step: a Button or a link. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-strong p-6 md:p-8",
        className,
      )}
    >
      {Icon ? (
        <span aria-hidden className="grid size-11 place-items-center rounded-full bg-sunk">
          <Icon className="size-5 stroke-[1.5] text-ink-2" />
        </span>
      ) : null}
      <div className="flex max-w-read flex-col gap-1">
        <p className="font-semibold text-ink">{title}</p>
        {body ? <p className="text-ink-2">{body}</p> : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap items-center gap-4">{action}</div> : null}
    </div>
  );
}
