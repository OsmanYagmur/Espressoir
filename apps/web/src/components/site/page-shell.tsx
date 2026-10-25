import { cn } from "@/lib/utils";

import { PageTransition } from "./page-transition";

/**
 * The page column with its 16px gutters: card grids up to 1080px, running text up to
 * 640px (`read`). Moving to another page, the old column fades out and the new one in
 * (PageTransition).
 */
export function PageShell({
  children,
  width = "grid",
  className,
}: {
  children: React.ReactNode;
  width?: "grid" | "read";
  className?: string;
}) {
  return (
    <PageTransition>
      <div
        className={cn(
          "mx-auto w-full px-4 pt-8 md:pt-12",
          width === "read" ? "max-w-read" : "max-w-grid",
          className,
        )}
      >
        {children}
      </div>
    </PageTransition>
  );
}
