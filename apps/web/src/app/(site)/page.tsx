import { ARTICLE_TOPICS } from "@espressoir/core";
import { ArrowRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { TastingCard } from "@/components/coffee/tasting-card";
import { GuideCard } from "@/components/info/guide-card";
import { InfoCard } from "@/components/info/info-card";
import { QuizBand } from "@/components/quiz/quiz-band";
import { JsonLd } from "@/components/site/json-ld";
import { PageShell } from "@/components/site/page-shell";
import { PhotoCredit, PhotoImage } from "@/components/site/photo";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { EventCard } from "@/components/workshop/event-card";
import { getArchive } from "@/lib/data/archive";
import { getArticles, isGuide } from "@/lib/data/articles";
import { loggedTastings } from "@/lib/data/selectors";
import { getCurrentYear } from "@/lib/data/today";
import { getOpenWorkshops } from "@/lib/data/workshops";
import { t } from "@/lib/i18n";
import { website } from "@/lib/structured-data";
import { cn } from "@/lib/utils";

const LATEST_COUNT = 3;
/** The classic methods: seven guides and "Bütün yazılar" fill two rows of four. */
const GUIDES_COUNT = 7;
/** Articles from each subject but the guides', in their list order. */
const READS_PER_TOPIC = 2;

const HERO_PHOTO = "ana-demleme";

const aside = "text-accent-ink underline underline-offset-3";
const arrow = "transition-transform group-hover/cta:translate-x-1";

/**
 * The home page (DESIGN.md → Sayfalar), a coffee guide first: one sentence on what is here
 * and one main action (start reading), the brewing methods with their numbers, the way
 * into the coffee quiz, the articles, the next workshop, the latest tasting notes.
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
  const guides = articles.filter(isGuide).slice(0, GUIDES_COUNT);
  const reads = ARTICLE_TOPICS.filter((topic) => topic !== "demleme").flatMap((topic) =>
    articles.filter((article) => article.topic === topic).slice(0, READS_PER_TOPIC),
  );

  return (
    <PageShell>
      <JsonLd data={website()} />
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
              <Link href="/bilgi">
                {t.home.cta.read}
                <ArrowRightIcon aria-hidden className={arrow} />
              </Link>
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

      {guides.length > 0 ? (
        <Section id="demleme">
          <SectionHeading id="demleme" title={t.home.guidesTitle} hint={t.home.guidesHint} />
          <ul aria-labelledby="demleme" className="grid stagger grid-cols-2 gap-4 md:grid-cols-4">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <GuideCard guide={guide} />
              </li>
            ))}
            {/* The last cell leads to everything else (seven methods fill two rows with it). */}
            <li>
              <Link
                href="/bilgi"
                className={cn(
                  cardClass,
                  "group flex h-full flex-col justify-end gap-2 text-accent-ink no-underline transition-[border-color,translate] hover:-translate-y-0.5 hover:border-line-strong",
                )}
              >
                <span className="font-semibold">{t.home.guidesAll}</span>
                <ArrowRightIcon
                  aria-hidden
                  className="size-5 stroke-[1.5] transition-transform group-hover:translate-x-1"
                />
              </Link>
            </li>
          </ul>
          <QuizBand
            id="kahve-testi"
            title={t.home.quizTitle}
            lead={t.home.quizLead}
            action={t.home.quizCta}
            className="mt-4"
          />
        </Section>
      ) : null}

      {reads.length > 0 ? (
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
            {reads.map((article) => (
              <li key={article.slug}>
                <InfoCard article={article} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {workshop ? (
        <Section id="siradaki-atolye">
          <SectionHeading id="siradaki-atolye" title={t.home.workshopTitle} />
          <EventCard workshop={workshop} action="details" href="/workshop" />
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
    </PageShell>
  );
}
