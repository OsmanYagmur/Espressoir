import { t } from "@/lib/i18n";

import { SectionHeading } from "./section-heading";

/** Placeholder for sections that land in a later phase: an empty form page. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-[1240px] px-5">
      <h1 className="font-wide border-b border-rule pt-9 pb-6 text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.86] font-extrabold tracking-[-0.03em] uppercase">
        {title}
        <span className="text-brand">.</span>
      </h1>
      <SectionHeading index={1} title={t.comingSoon.title} />
      <p className="max-w-[62ch] py-5 text-muted-foreground">{t.comingSoon.body}</p>
      <div aria-hidden className="space-y-4 border-b border-border pb-6">
        <div className="h-5 w-1/2 border-b border-dashed border-input" />
        <div className="h-5 w-3/4 border-b border-dashed border-input" />
        <div className="h-5 w-2/5 border-b border-dashed border-input" />
      </div>
    </div>
  );
}
