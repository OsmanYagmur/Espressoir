import type { Metadata } from "next";
import { Suspense } from "react";

import { recipeAmounts, recipeTiming } from "@/components/info/guide-card";
import { CoffeeQuiz, QuizPreview, type QuizGuide } from "@/components/quiz/coffee-quiz";
import { PageHeading } from "@/components/site/page-heading";
import { PageShell } from "@/components/site/page-shell";
import { QUIZ_METHODS, type QuizMethod } from "@/content/kahve-testi";
import { getArticles, isGuide } from "@/lib/data/articles";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.quiz.heading,
  description: t.quiz.description,
  alternates: { canonical: "/kahve-testi" },
};

/**
 * /kahve-testi: five questions, then the brewing method and the roast that suit the
 * reader, each leading to its guide or article. Static; the questions run in the browser.
 */
export default async function QuizPage() {
  const guides = (await getArticles()).filter(isGuide);
  // Every method a result can name is a guide; a missing one stops the build.
  const byMethod = Object.fromEntries(
    QUIZ_METHODS.map((slug) => {
      const guide = guides.find((candidate) => candidate.slug === slug);
      if (!guide) throw new Error(`src/content/kahve-testi.ts: "${slug}" adında bir rehber yok.`);
      const entry: QuizGuide = {
        slug,
        method: guide.recipe.method,
        summary: guide.summary,
        figures: `${recipeAmounts(guide)} · ${recipeTiming(guide)}`,
      };
      return [slug, entry];
    }),
  ) as Record<QuizMethod, QuizGuide>;

  return (
    <PageShell width="read">
      <PageHeading title={t.quiz.heading} lead={t.quiz.lead} />
      {/* A shared result is in the address (?c=…), known only in the browser. */}
      <Suspense fallback={<QuizPreview />}>
        <CoffeeQuiz guides={byMethod} />
      </Suspense>
    </PageShell>
  );
}
