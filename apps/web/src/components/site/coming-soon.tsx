import { t } from "@/lib/i18n";

import { RingMark } from "./logo";

/** Placeholder for sections that land in a later phase. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">{title}</h1>
      <div className="paper-ruled mt-10 flex items-start gap-4 rounded-xl border border-border bg-card px-6 py-7 leading-7">
        <RingMark className="mt-0.5 size-8 shrink-0" />
        <div>
          <p className="font-medium">{t.comingSoon.title}</p>
          <p className="font-serif text-muted-foreground italic">{t.comingSoon.body}</p>
        </div>
      </div>
    </div>
  );
}
