import { SCORE_MAX, SCORE_MIN, siteConfig } from "@espressoir/core";

import { ScoreBadge } from "@/components/coffee/score-badge";
import { RingMark } from "@/components/site/logo";
import { t } from "@/lib/i18n";

const scale = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i);

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <section className="relative pt-14 pb-12 sm:pt-24 sm:pb-16">
        <RingMark
          thin
          className="pointer-events-none absolute top-10 -right-16 hidden size-80 opacity-25 md:block lg:-right-24"
        />
        <p className="text-sm font-semibold tracking-[0.18em] text-brand uppercase">
          {t.home.eyebrow}
        </p>
        <h1 className="mt-4 max-w-3xl text-5xl leading-[1.02] font-medium tracking-tight sm:text-7xl">
          {siteConfig.tagline.tr}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t.home.lead}
        </p>
      </section>

      <section aria-labelledby="yontemler" className="border-t border-border/70 py-10">
        <h2 id="yontemler" className="text-2xl font-medium">
          {t.home.methodsTitle}
        </h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {t.home.methods.map((method) => (
            <li
              key={method}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm text-card-foreground"
            >
              {method}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 py-10 md:grid-cols-[1.2fr_1fr]">
        <div className="paper-ruled rounded-xl border border-border bg-card px-6 py-7 leading-7">
          <h2 className="text-2xl leading-7 font-medium">{t.home.comingSoonTitle}</h2>
          <p className="mt-7 font-serif text-lg leading-7 text-muted-foreground italic">
            {t.home.comingSoonBody}
          </p>
        </div>
        <div className="rounded-xl border border-border px-6 py-7">
          <h2 className="text-2xl font-medium">{t.home.scaleTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.home.scaleBody}</p>
          <ol className="mt-5 flex flex-wrap gap-1.5" aria-label={t.home.scaleTitle}>
            {scale.map((score) => (
              <li key={score}>
                <ScoreBadge score={score} />
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
