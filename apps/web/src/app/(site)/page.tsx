import type { Route } from "next";
import Link from "next/link";

import { TastingCard } from "@/components/coffee/tasting-card";
import { InfoCard } from "@/components/info/info-card";
import { PageShell } from "@/components/site/page-shell";
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

const aside = "text-accent-ink underline underline-offset-3";

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
        className="flex flex-col gap-4 rounded-lg bg-crema p-6 text-on-crema md:p-12"
      >
        <h1 id="giris" className="max-w-read type-display">
          {t.home.heroTitle}
        </h1>
        <p className="max-w-read text-lg">{t.home.heroLead}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Button asChild>
            {workshop ? (
              <Link href={"/atolye#basvuru" as Route} prefetch={false}>
                {t.home.cta.workshop}
              </Link>
            ) : (
              <Link href="/panel/tadim/yeni" prefetch={false}>
                {t.home.cta.addTasting}
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
          <ul aria-labelledby="son-tadimlar" className="grid gap-4 md:grid-cols-3">
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
          <ul aria-labelledby="bilgi" className="grid gap-4 md:grid-cols-3">
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
