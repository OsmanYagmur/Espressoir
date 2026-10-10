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
      <div className="border-b border-rule pt-9 pb-6">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-16 w-full max-w-2xl" />
      </div>
      <div className="grid grid-cols-2 gap-px border-b border-rule md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="m-3 h-14" />
        ))}
      </div>
      <div className="mt-6 space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
