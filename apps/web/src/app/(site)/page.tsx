import { ArrowRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { TastingCard } from "@/components/coffee/tasting-card";
import { InfoCard } from "@/components/info/info-card";
import { PageShell } from "@/components/site/page-shell";
import { PhotoCredit, PhotoImage } from "@/components/site/photo";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/workshop/event-card";
import { getArchive } from "@/lib/data/archive";
import { getArticles } from "@/lib/data/articles";
import { loggedTastings } from "@/lib/data/selectors";
import { getCurrentYear } from "@/lib/data/today";
import { getOpenWorkshops } from "@/lib/data/workshops";
import { t } from "@/lib/i18n";

const LATEST_COUNT = 3;
const INFO_COUNT = 3;

const HERO_PHOTO = "ana-demleme";

const aside = "text-accent-ink underline underline-offset-3";
const arrow = "transition-transform group-hover/cta:translate-x-1";

/**
 * The home page (DESIGN.md → Sayfalar): one sentence on what this is and one main action
 * (apply to the open workshop, or add a tasting when there is none), the next workshop,
 * the latest tastings, a few short articles.
 */
export default async function HomePage() {
  const [archive, workshops, articles, currentYear] = await Promise.all([
    getArchive(),
    getOpenWorkshops(),
    getArticles(),
    getCurrentYear(),
  ]);
  const workshop = workshops[0];
  const latest = loggedTastings(archive).slice(0, LATEST_COUNT);

  return (
    <PageShell>
      <section
        aria-labelledby="giris"
        className="grid overflow-hidden rounded-lg bg-crema text-on-crema md:grid-cols-[1.1fr_1fr]"
      >
        <div className="flex stagger flex-col justify-center gap-4 p-6 md:p-12">
          <h1 id="giris" className="type-display">
            {t.home.heroTitle}
          </h1>
          <p className="text-lg">{t.home.heroLead}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button asChild className="group/cta">
              {workshop ? (
                <Link href={"/atolye#basvuru" as Route} prefetch={false}>
                  {t.home.cta.workshop}
                  <ArrowRightIcon aria-hidden className={arrow} />
                </Link>
              ) : (
                <Link href="/panel/tadim/yeni" prefetch={false}>
                  {t.home.cta.addTasting}
                  <ArrowRightIcon aria-hidden className={arrow} />
                </Link>
              )}
            </Button>
            <Link
              href={"/hakkinda#nasil-calisir" as Route}
              className="text-on-crema underline underline-offset-3"
            >
              {t.home.cta.how}
            </Link>
          </div>
        </div>
        <div className="relative aspect-4/3 overflow-hidden md:aspect-auto md:min-h-110">
          <PhotoImage
            id={HERO_PHOTO}
            priority
            sizes="(min-width: 768px) 520px, 100vw"
            className="absolute inset-0 size-full motion-safe:animate-settle"
          />
          <PhotoCredit
            id={HERO_PHOTO}
            className="absolute right-3 bottom-3 rounded-full bg-bg/85 px-3 py-1 text-ink"
          />
        </div>
      </section>

      {workshop ? (
        <Section id="siradaki-atolye">
          <SectionHeading id="siradaki-atolye" title={t.home.workshopTitle} />
          <EventCard workshop={workshop} action="details" href="/atolye" />
        </Section>
      ) : null}

      <Section id="son-tadimlar">
        <SectionHeading
          id="son-tadimlar"
          title={t.home.latestTitle}
          aside={
            latest.length > 0 ? (
              <Link href="/akis" className={aside}>
                {t.home.latestAll}
              </Link>
            ) : undefined
          }
        />
        {latest.length > 0 ? (
          <ul aria-labelledby="son-tadimlar" className="grid stagger gap-4 md:grid-cols-3">
            {latest.map((tasting) => (
              <li key={tasting.id}>
                <TastingCard tasting={tasting} currentYear={currentYear} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-2">{t.home.latestEmpty}</p>
        )}
      </Section>

      {articles.length > 0 ? (
        <Section id="bilgi">
          <SectionHeading
            id="bilgi"
            title={t.home.infoTitle}
            aside={
              <Link href="/bilgi" className={aside}>
                {t.home.infoAll}
              </Link>
            }
          />
          <ul aria-labelledby="bilgi" className="grid stagger gap-4 md:grid-cols-3">
            {articles.slice(0, INFO_COUNT).map((article) => (
              <li key={article.slug}>
                <InfoCard article={article} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </PageShell>
  );
}
