import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

/**
 * Placeholder for pages whose content depends on the URL (a coffee, a brand). It is what a
 * link shows the instant it is clicked, before that page's own content arrives.
 */
export function PageSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{t.states.loading}</span>
      <Skeleton className="h-11 w-full max-w-xl md:h-15" />
      <Skeleton className="mt-4 h-7 w-full max-w-md" />
      <div className="mt-12 grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
