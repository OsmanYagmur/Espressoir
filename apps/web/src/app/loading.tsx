import { PageShell } from "@/components/site/page-shell";
import { PageSkeleton } from "@/components/site/page-skeleton";

export default function Loading() {
  return (
    <PageShell>
      <PageSkeleton />
    </PageShell>
  );
}
