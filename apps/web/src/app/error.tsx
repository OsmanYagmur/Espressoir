"use client";

import { RingMark } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <RingMark thin className="size-24 opacity-80" />
      <h1 className="mt-6 text-4xl font-medium tracking-tight">{t.states.errorTitle}</h1>
      <p className="mt-4 text-muted-foreground">{t.states.errorBody}</p>
      <Button className="mt-8" onClick={() => reset()}>
        {t.states.retry}
      </Button>
    </div>
  );
}
