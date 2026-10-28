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
        tone === "error" ? "font-medium text-danger" : "rounded-md bg-sage-soft p-4 text-sage-ink",
        className,
      )}
    >
      {children}
    </p>
  );
}
