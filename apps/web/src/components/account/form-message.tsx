import { cn } from "@/lib/utils";

/** The line a form prints about itself: what went wrong, or that it was saved. */
export function FormMessage({
  children,
  tone = "error",
  className,
}: {
  children: React.ReactNode;
  tone?: "error" | "success";
  className?: string;
}) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "border-l-2 pl-3 font-mono text-sm",
        tone === "error" ? "border-destructive text-destructive" : "border-rule",
        className,
      )}
    >
      {children}
    </p>
  );
}
