import type * as React from "react";

import { cn } from "@/lib/utils";

/** A card's surface: always framed by a 1px line, never by a shadow. */
export const cardClass = "rounded-lg border border-line bg-surface p-4 md:p-6";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(cardClass, className)} {...props} />;
}
