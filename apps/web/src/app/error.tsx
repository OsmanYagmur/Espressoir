"use client";

import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageShell width="read">
      <PageHeading title={t.states.errorTitle} lead={t.states.errorBody}>
        <Button onClick={() => reset()}>{t.states.retry}</Button>
      </PageHeading>
    </PageShell>
  );
}
