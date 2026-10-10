"use client";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-[1240px] px-5">
      <div className="border-b border-rule pt-9 pb-8">
        <h1 className="font-wide text-[clamp(2.5rem,7vw,5rem)] leading-[0.9] font-extrabold tracking-[-0.03em] uppercase">
          {t.states.errorTitle}
          <span className="text-brand">.</span>
        </h1>
        <p className="mt-4 max-w-[52ch] text-muted-foreground">{t.states.errorBody}</p>
        <Button className="mt-6 font-mono text-xs uppercase" onClick={() => reset()}>
          {t.states.retry}
        </Button>
      </div>
    </div>
  );
}
