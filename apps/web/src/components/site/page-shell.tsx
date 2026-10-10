import { cn } from "@/lib/utils";

/** The page column: same width and gutters as the header and footer. */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto max-w-[1240px] px-5", className)}>{children}</div>;
}
