import { cn } from "@/lib/utils";

/**
 * The page column with its 16px gutters: card grids up to 1080px, running text up to
 * 640px (`read`).
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
    <div
      className={cn(
        "mx-auto w-full px-4 pt-8 md:pt-12",
        width === "read" ? "max-w-read" : "max-w-grid",
        className,
      )}
    >
      {children}
    </div>
  );
}
