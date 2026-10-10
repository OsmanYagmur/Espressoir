import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1240px] px-5 pt-9" role="status" aria-live="polite">
      <span className="sr-only">{t.states.loading}</span>
      <Skeleton className="h-20 w-full max-w-xl" />
      <div className="mt-6 grid grid-cols-2 gap-px border-y border-rule md:grid-cols-4">
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
