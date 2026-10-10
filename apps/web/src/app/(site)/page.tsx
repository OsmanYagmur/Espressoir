import { SCORE_MAX, SCORE_MIN } from "@espressoir/core";

import { ScoreBadge } from "@/components/coffee/score-badge";
import { SectionHeading } from "@/components/site/section-heading";
import { t } from "@/lib/i18n";

const scale = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i);

const fields = [
  t.home.fields.tastings,
  t.home.fields.coffees,
  t.home.fields.brands,
  t.home.fields.average,
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-[1240px] px-5">
      <section className="grid gap-5 border-b border-rule pt-9 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <h1 className="font-wide text-[clamp(3.25rem,10.5vw,8.9rem)] leading-[0.84] font-extrabold tracking-[-0.035em] uppercase">
          {t.home.title}
          <span className="text-brand">.</span>
        </h1>
        <div className="max-w-sm font-mono text-xs leading-relaxed text-muted-foreground md:text-right">
          <p className="text-foreground">{t.home.intro}</p>
          <p className="mt-2">{t.home.methodsLine}</p>
        </div>
      </section>

      {/* Phase 0: the form's fields are still blank — real counts arrive with the archive.
          The 1px gaps over an ink background draw the rules between the fields. */}
      <dl className="grid grid-cols-2 gap-px border-b border-rule bg-rule md:grid-cols-4">
        {fields.map((label) => (
          <div
            key={label}
            className="bg-background px-3.5 pt-3 pb-3.5 max-md:odd:pl-0 md:first:pl-0"
          >
            <dt className="label-caps text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-[clamp(2rem,4vw,2.75rem)] leading-tight font-bold text-muted-foreground/50">
              —
            </dd>
            <dd className="font-mono text-xs text-muted-foreground">{t.home.fieldEmpty}</dd>
          </div>
        ))}
      </dl>

      <div className="grid md:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="son-tadimlar" className="md:border-r md:border-rule md:pr-6">
          <SectionHeading id="son-tadimlar" index={1} title={t.home.latestTitle} />
          <ol aria-label={t.home.latestTitle}>
            {[0, 1, 2].map((row) => (
              <li
                key={row}
                aria-hidden={row > 0}
                className="grid grid-cols-[minmax(0,1fr)_54px] gap-4 border-b border-border py-4"
              >
                <div className="space-y-2.5">
                  <div className="h-3 w-24 border-b border-dashed border-input" />
                  <div className="h-6 w-2/3 border-b border-dashed border-input" />
                  {row === 0 ? (
                    <p className="max-w-[62ch] pt-1 text-[0.9rem] text-muted-foreground">
                      {t.home.latestEmpty}
                    </p>
                  ) : (
                    <div className="h-4 w-5/6 border-b border-dashed border-input" />
                  )}
                </div>
                <ScoreBadge score={null} />
              </li>
            ))}
          </ol>
        </section>

        <aside className="md:pl-6">
          <SectionHeading index={2} title={t.home.scaleTitle} aside="1–10" />
          <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
            {t.home.scaleBody}
          </p>
          <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label={t.home.scaleTitle}>
            {scale.map((score) => (
              <li key={score}>
                <ScoreBadge score={score} size="sm" className="w-full" />
              </li>
            ))}
          </ol>

          <SectionHeading index={3} title={t.home.methodsTitle} className="mt-6" />
          <ul className="font-mono text-[0.8rem]">
            {t.home.methods.map((method) => (
              <li key={method} className="flex items-center gap-2.5 border-b border-border py-2">
                <span aria-hidden className="size-3 border-[1.5px] border-foreground" />
                {method}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
