import { ARTICLE_TOPICS } from "@espressoir/core";
import {
  ArrowRightIcon,
  ChartLineIcon,
  NotebookPenIcon,
  SearchIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CoffeeList } from "@/components/coffee/coffee-list";
import { TastingCard } from "@/components/coffee/tasting-card";
import { HeroActions } from "@/components/home/hero-actions";
import { SampleTasting } from "@/components/home/sample-tasting";
import { ArticleRow } from "@/components/info/article-row";
import { GuideCard } from "@/components/info/guide-card";
import { InfoCard } from "@/components/info/info-card";
import { QuizBand } from "@/components/quiz/quiz-band";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/site/json-ld";
import { PageShell } from "@/components/site/page-shell";
import { PhotoCredit, PhotoImage } from "@/components/site/photo";
import { Section, SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { EventCard } from "@/components/workshop/event-card";
import { toCoffeeCards } from "@/lib/coffee-cards";
import { getArchive } from "@/lib/data/archive";
import { getArticles, isGuide } from "@/lib/data/articles";
import { loggedTastings, toListItems, topCoffees } from "@/lib/data/selectors";
import { getCurrentYear } from "@/lib/data/today";
import { getOpenWorkshops } from "@/lib/data/workshops";
import { t } from "@/lib/i18n";
import { website } from "@/lib/structured-data";
import { cn } from "@/lib/utils";

// Title and description are the site's defaults (root layout); only the address is set here.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const LATEST_COUNT = 3;
const COFFEES_COUNT = 6;
/** Three methods and "Bütün rehberler" fill one row of four. */
const GUIDES_COUNT = 3;
/** The first article of each subject but the guides', then the second ones. */
const READS_COUNT = 5;

const HERO_PHOTO = "ana-demleme";

const aside = "text-accent-ink underline underline-offset-3";

const HOW_ICONS: readonly LucideIcon[] = [SearchIcon, NotebookPenIcon, ChartLineIcon];

/**
 * The home page (DESIGN.md → Sayfalar), the notebook first: what Espressoir is and the way
 * in (a sample entry beside it shows what a tasting records), how it works in three steps,
 * the latest notes and the best-liked coffees from the archive, then the guides, the quiz
 * and the articles, and the next workshop when there is one.
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
  const top = topCoffees(archive, COFFEES_COUNT).map((coffee) => coffee.id);
  const listItems = toListItems(archive);
  const coffees = toCoffeeCards(
    top.flatMap((id) => listItems.filter((item) => item.id === id)),
    archive.brewMethods,
  );
  const guides = articles.filter(isGuide).slice(0, GUIDES_COUNT);
  const byTopic = ARTICLE_TOPICS.filter((topic) => topic !== "demleme").map((topic) =>
    articles.filter((article) => article.topic === topic),
  );
  const reads = [0, 1]
    .flatMap((index) => byTopic.flatMap((group) => group.slice(index, index + 1)))
    .slice(0, READS_COUNT);
  const [featured, ...moreReads] = reads;

  return (
    <PageShell>
      <JsonLd data={website()} />
      <section
        aria-labelledby="giris"
        className="grid items-center gap-y-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-20"
      >
        <div className="flex stagger flex-col gap-5">
          <p className="type-kicker">{t.home.heroKicker}</p>
          <h1 id="giris" className="type-display">
            {t.home.heroTitle}{" "}
            <em className="block font-medium text-ink-2 italic">{t.home.heroTitleSecond}</em>
          </h1>
          <p className="max-w-read type-lead">{t.home.heroLead}</p>
          <HeroActions />
        </div>
        <div className="relative lg:pb-12">
          <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-sunk md:aspect-video lg:aspect-square">
            <PhotoImage
              id={HERO_PHOTO}
              priority
              sizes="(min-width: 1024px) 520px, 100vw"
              className="absolute inset-0 size-full motion-safe:animate-settle"
            />
            <PhotoCredit
              id={HERO_PHOTO}
              className="absolute top-3 right-3 rounded-full bg-bg/85 px-3 py-1 text-ink"
            />
          </div>
          <SampleTasting className="relative mx-4 -mt-16 max-w-sm motion-safe:animate-rise motion-safe:animate-delay-300 md:mx-8 lg:absolute lg:bottom-0 lg:-left-10 lg:mx-0 lg:mt-0 lg:w-76 lg:max-w-none xl:w-84" />
        </div>
      </section>

      <Section id="nasil-calisir">
        <SectionHeading id="nasil-calisir" title={t.home.howTitle} hint={t.home.howHint} />
        <ol className="grid stagger gap-x-8 gap-y-6 md:grid-cols-3">
          {t.home.how.map((step, index) => {
            const Icon = HOW_ICONS[index] ?? SearchIcon;
            return (
              <li key={step.title} className="flex flex-col gap-3 border-t border-line pt-6">
                <span
                  aria-hidden
                  className="grid size-11 place-items-center rounded-full bg-sage-soft text-sage-ink"
                >
                  <Icon className="size-5 stroke-[1.5]" />
                </span>
                <h3 className="type-card-title">{step.title}</h3>
                <p className="text-ink-2">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section id="son-tadimlar">
        <SectionHeading
          id="son-tadimlar"
          title={t.home.latestTitle}
          hint={t.home.latestHint}
          aside={
            latest.length > 0 ? (
              <Link href="/akis" prefetch={false} className={aside}>
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
          <EmptyState
            title={t.home.latestEmptyTitle}
            body={t.home.latestEmptyBody}
            action={
              <Button asChild variant="secondary">
                <Link href="/kahveler" prefetch={false}>
                  {t.home.cta.explore}
                </Link>
              </Button>
            }
          />
        )}
      </Section>

      {coffees.length > 0 ? (
        <Section id="kahveleri-kesfet">
          <SectionHeading
            id="kahveleri-kesfet"
            title={t.home.coffeesTitle}
            hint={t.home.coffeesHint}
            aside={
              <Link href="/kahveler" prefetch={false} className={aside}>
                {t.home.coffeesAll}
              </Link>
            }
          />
          <CoffeeList coffees={coffees} view="cards" label={t.home.coffeesTitle} />
        </Section>
      ) : null}

      {guides.length > 0 ? (
        <Section id="demleme">
          <SectionHeading id="demleme" title={t.home.guidesTitle} hint={t.home.guidesHint} />
          <ul aria-labelledby="demleme" className="grid stagger grid-cols-2 gap-4 md:grid-cols-4">
            {guides.map((guide) => (
              <li key={guide.slug}>
                <GuideCard guide={guide} />
              </li>
            ))}
            {/* The last cell leads to every other method and article. */}
            <li>
              <Link
                href="/bilgi"
                className={cn(
                  cardClass,
                  "group flex h-full flex-col justify-end gap-2 bg-sunk text-accent-ink no-underline transition-[border-color,translate] hover:-translate-y-0.5 hover:border-line-strong",
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

      {featured ? (
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
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <InfoCard article={featured} />
            {moreReads.length > 0 ? (
              <ul
                aria-labelledby="bilgi"
                className="divide-y divide-line self-start border-y border-line"
              >
                {moreReads.map((article) => (
                  <li key={article.slug}>
                    <ArticleRow article={article} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Section>
      ) : null}

      {workshop ? (
        <Section id="siradaki-atolye">
          <SectionHeading id="siradaki-atolye" title={t.home.workshopTitle} />
          <EventCard workshop={workshop} action="details" href="/workshop" />
        </Section>
      ) : null}
    </PageShell>
  );
}
