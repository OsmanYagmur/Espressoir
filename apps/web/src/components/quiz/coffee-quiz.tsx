"use client";

import { decodeAnswers, encodeAnswers, tally } from "@espressoir/core";
import { ArrowLeftIcon, ArrowRightIcon, RotateCcwIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ShareButton } from "@/components/site/share-button";
import { Button } from "@/components/ui/button";
import {
  QUIZ,
  QUIZ_METHODS,
  QUIZ_ROAST_ARTICLE,
  QUIZ_ROAST_TEXT,
  QUIZ_ROASTS,
  type QuizMethod,
} from "@/content/kahve-testi";
import { format, t } from "@/lib/i18n";

const q = t.quiz;
const OPTION_COUNTS = QUIZ.map((question) => question.options.length);

/** What the result shows of a guide, prepared on the server. */
export interface QuizGuide {
  slug: string;
  method: string;
  summary: string;
  /** "15 g · 240 ml · 2,5–3 dk · orta öğütme" */
  figures: string;
}

const optionClass =
  "flex w-full cursor-pointer flex-col items-start gap-1 rounded-md border border-line-strong bg-surface px-4 py-3 text-left transition-[background-color,border-color,translate] hover:-translate-y-0.5 hover:border-ink aria-pressed:border-ink aria-pressed:bg-sunk";

/** One question: its options are buttons, a press answers it and moves on. */
function Question({
  step,
  answers,
  onAnswer,
  onBack,
}: {
  step: number;
  answers: readonly number[];
  onAnswer?: (option: number) => void;
  onBack?: () => void;
}) {
  const question = QUIZ[step]!;
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  // After a press the next question is announced: the focus moves to it (not on arrival).
  useEffect(() => {
    if (first.current) first.current = false;
    else heading.current?.focus();
  }, [step]);

  return (
    <div key={step} className="flex flex-col gap-6 motion-safe:animate-rise">
      <div className="flex flex-col gap-3">
        <p className="type-meta">{format(q.progress, { current: step + 1, total: QUIZ.length })}</p>
        <span aria-hidden className="h-1 overflow-hidden rounded-full bg-sunk">
          <span
            className="block h-full rounded-full bg-ink-2 motion-safe:transition-[width]"
            style={{ width: `${(step / QUIZ.length) * 100}%` }}
          />
        </span>
        <h2 ref={heading} tabIndex={-1} className="type-title outline-none">
          {question.question}
        </h2>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {question.options.map((option, index) => (
          <li key={option.label}>
            <button
              type="button"
              aria-pressed={answers[step] === index}
              onClick={() => onAnswer?.(index)}
              className={optionClass}
            >
              <span className="font-semibold">{option.label}</span>
              {option.hint ? <span className="type-meta">{option.hint}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      {step > 0 ? (
        <Button variant="text" onClick={onBack} className="self-start">
          <ArrowLeftIcon aria-hidden />
          {q.back}
        </Button>
      ) : null}
    </div>
  );
}

function Result({
  answers,
  guides,
  onAgain,
  announce,
}: {
  answers: readonly number[];
  guides: Readonly<Record<QuizMethod, QuizGuide>>;
  onAgain: () => void;
  /** Reached by answering (not from a shared link): the focus moves to the result. */
  announce: boolean;
}) {
  const picks = answers.map((answer, i) => QUIZ[i]!.options[answer]!);
  const method = tally(
    QUIZ_METHODS,
    picks.map((pick) => pick.methods),
  );
  const roast =
    QUIZ_ROAST_TEXT[
      tally(
        QUIZ_ROASTS,
        picks.map((pick) => pick.roasts ?? {}),
      )
    ];
  const guide = guides[method];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (announce) heading.current?.focus();
  }, [announce]);

  return (
    <div className="flex flex-col gap-8 motion-safe:animate-rise">
      <div className="flex flex-col gap-3">
        <p className="type-meta">{q.resultKicker}</p>
        <h2 ref={heading} tabIndex={-1} className="type-display outline-none">
          {guide.method}
        </h2>
        <p className="type-lead">{guide.summary}</p>
        <p className="type-figure text-ink-2">{guide.figures}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <Button asChild className="group/cta">
          <Link href={`/bilgi/${guide.slug}` as Route}>
            {q.openGuide}
            <ArrowRightIcon
              aria-hidden
              className="transition-transform group-hover/cta:translate-x-1"
            />
          </Link>
        </Button>
        <ShareButton
          title={format(q.shareTitle, { method: guide.method })}
          text={format(q.shareText, { method: guide.method })}
          path={`/kahve-testi?c=${encodeAnswers(answers)}`}
        />
      </div>
      <section
        aria-labelledby="kavrum"
        className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 md:p-6"
      >
        <p className="type-meta">{q.roastTitle}</p>
        <h3 id="kavrum" className="type-card-title">
          {roast.title}
        </h3>
        <p>{roast.text}</p>
        {roast.origins ? (
          <p className="text-ink-2">
            <span className="font-semibold text-ink">{q.originTitle}:</span> {roast.origins}
          </p>
        ) : null}
        <Link
          href={`/bilgi/${QUIZ_ROAST_ARTICLE}` as Route}
          className="mt-1 self-start text-accent-ink underline underline-offset-3"
        >
          {q.roastLink}
        </Link>
      </section>
      <Button variant="secondary" onClick={onAgain} className="self-start">
        <RotateCcwIcon aria-hidden />
        {q.again}
      </Button>
    </div>
  );
}

/** The first question as the static page shows it before the browser takes over. */
export function QuizPreview() {
  return <Question step={0} answers={[]} />;
}

/**
 * The quiz: one question at a time, a press answers and moves on, "Önceki soru" goes back.
 * The answers live in the address once complete (`?c=02110`), so a result opens again
 * from a shared link.
 */
export function CoffeeQuiz({ guides }: { guides: Readonly<Record<QuizMethod, QuizGuide>> }) {
  const shared = useSearchParams().get("c") ?? "";
  const [answers, setAnswers] = useState<number[]>(
    () => decodeAnswers(shared, OPTION_COUNTS) ?? [],
  );
  const [answered, setAnswered] = useState(false);
  const done = answers.length === QUIZ.length;

  function save(next: number[]) {
    setAnswers(next);
    setAnswered(true);
    const url =
      next.length === QUIZ.length ? `?c=${encodeAnswers(next)}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  return (
    <div className="flex flex-col gap-6">
      {done ? (
        <Result answers={answers} guides={guides} onAgain={() => save([])} announce={answered} />
      ) : (
        <Question
          step={answers.length}
          answers={answers}
          onAnswer={(option) => save([...answers, option])}
          onBack={() => save(answers.slice(0, -1))}
        />
      )}
    </div>
  );
}
