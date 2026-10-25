"use client";

import {
  brewState,
  formatClock,
  formatRatio,
  readyWindow,
  scaleRecipe,
  scaledPour,
  shotVerdict,
  type BrewPlan,
  type SteepPlan,
  type TimedPlan,
} from "@espressoir/core";
import { PauseIcon, PlayIcon, RotateCcwIcon, SquareIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Chips, ToggleChip } from "@/components/ui/chip";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const b = t.brew;

/** "240 ml", "1 l", "36 g"; the number and its unit never part. */
function amountText(value: number, unit: BrewPlan["waterUnit"]): string {
  if (unit === "ml" && value >= 1000) return `${String(value / 1000).replace(".", ",")} l`;
  return `${value} ${unit}`;
}

/** The scaled recipe in one line: coffee, water and the ratio between them. */
function Amounts({ plan, cups }: { plan: BrewPlan; cups: number }) {
  const { dose, water } = scaleRecipe(plan, cups);
  const rows = [
    { label: b.dose, value: `${dose} g` },
    { label: b.water, value: amountText(water, plan.waterUnit) },
    { label: b.ratio, value: formatRatio(dose, water) },
  ];
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-2">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-baseline gap-2">
          <dt className="type-meta">{label}</dt>
          <dd className="font-mono tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** How many cups, for the methods that make more than one at once. */
function CupChoice({
  plan,
  cups,
  onChange,
  disabled,
}: {
  plan: BrewPlan;
  cups: number;
  onChange: (cups: number) => void;
  disabled: boolean;
}) {
  if (plan.maxCups < 2) return null;
  return (
    <div role="group" aria-labelledby="demleme-fincan" className="flex flex-col gap-2">
      <p id="demleme-fincan" className="type-label">
        {b.cups}
      </p>
      <Chips>
        {Array.from({ length: plan.maxCups }, (_, i) => i + 1).map((count) => (
          <ToggleChip
            key={count}
            aria-pressed={cups === count}
            disabled={disabled}
            onClick={() => onChange(count)}
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            {format(b.cupCount, { count })}
          </ToggleChip>
        ))}
      </Chips>
    </div>
  );
}

type Run =
  | { status: "idle" }
  | { status: "running"; since: number; carried: number }
  | { status: "paused" | "finished"; carried: number };

const elapsedOf = (run: Run, now: number) =>
  run.status === "idle"
    ? 0
    : run.status === "running"
      ? run.carried + (now - run.since) / 1000
      : run.carried;

/** Keeps the screen on while `on` (where the browser allows it), asking again on return. */
function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = () => {
      navigator.wakeLock.request("screen").then(
        (lock) => {
          if (cancelled) void lock.release();
          else sentinel = lock;
        },
        () => {},
      );
    };
    // The browser lets the lock go when the tab is hidden; it is asked for again on return.
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [on]);
}

/** A short buzz on phones that have one. */
const buzz = (pattern: number | number[]) => navigator.vibrate?.(pattern);

/**
 * The guide's clock: start it with the first pour and it walks through the stages, saying
 * what to do now, where the scale should stand and what comes next. Paused and resumed at
 * will; the screen stays on while it runs and a phone buzzes at each new stage. An
 * espresso plan is a shot timer instead: stopped by hand, it says how the shot ran.
 */
function TimedAssistant({ plan }: { plan: TimedPlan }) {
  const [cups, setCups] = useState(1);
  const [run, setRun] = useState<Run>({ status: "idle" });
  const [now, setNow] = useState(0);

  const running = run.status === "running";
  const elapsed = elapsedOf(run, now);
  const state = brewState(plan, elapsed);
  const stage = plan.stages[state.index]!;
  const next = plan.stages[state.index + 1];
  const pour = scaledPour(plan, stage, cups);
  const finished = run.status === "finished";
  const shot = plan.shot;

  // The clock ticks while it runs; a timed brew ends by itself, a shot when it is stopped.
  useEffect(() => {
    if (run.status !== "running") return;
    const tick = () => {
      const moment = Date.now();
      setNow(moment);
      if (!shot && elapsedOf(run, moment) >= plan.end) {
        setRun({ status: "finished", carried: plan.end });
        buzz([200, 100, 200]);
      }
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [run, plan.end, shot]);

  // A new stage is felt as well as seen.
  const shownStage = useRef(state.index);
  useEffect(() => {
    if (shownStage.current !== state.index && running) buzz(200);
    shownStage.current = state.index;
  }, [state.index, running]);

  useWakeLock(running);

  // Each press reads the clock itself: the last tick may be a quarter second old.
  const start = () => {
    const moment = Date.now();
    setNow(moment);
    setRun({ status: "running", since: moment, carried: elapsedOf(run, moment) });
  };
  const pause = () => setRun({ status: "paused", carried: elapsedOf(run, Date.now()) });
  const stop = () => setRun({ status: "finished", carried: elapsedOf(run, Date.now()) });
  const reset = () => setRun({ status: "idle" });

  const verdict = shot && finished ? shotVerdict(shot, elapsed) : null;

  return (
    <div className="flex flex-col gap-6">
      <CupChoice plan={plan} cups={cups} onChange={setCups} disabled={run.status !== "idle"} />
      {plan.maxCups > 1 ? <Amounts plan={plan} cups={cups} /> : null}

      <div className="flex flex-col gap-3">
        <p
          role="timer"
          aria-label={format(b.clock, {
            time: formatClock(elapsed),
            total: formatClock(plan.end),
          })}
          className="flex items-baseline gap-2"
        >
          <span className="font-mono text-6xl font-medium tabular-nums md:text-7xl">
            {formatClock(elapsed)}
          </span>
          <span aria-hidden className="font-mono text-lg text-ink-2 tabular-nums">
            / {formatClock(plan.end)}
          </span>
        </p>
        <span aria-hidden className="h-1 overflow-hidden rounded-full bg-sunk">
          <span
            className="block h-full rounded-full bg-accent motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-linear"
            style={{ width: `${state.progress * 100}%` }}
          />
        </span>
        {shot ? (
          <p className="type-meta">{format(b.shotTarget, { from: shot.from, to: shot.to })}</p>
        ) : null}
      </div>

      {/* What to do now: read out when it changes, never on every tick of the clock. */}
      <div aria-live="polite" className="flex flex-col gap-2 rounded-md bg-sunk p-4">
        {finished ? (
          <>
            <p className="type-card-title">
              {verdict ? format(b.shotTime, { seconds: Math.round(elapsed) }) : b.done}
            </p>
            <p>{verdict ? b.shot[verdict] : plan.finish}</p>
          </>
        ) : (
          <>
            <p className="type-meta">{b.now}</p>
            <p className="type-card-title">{stage.title}</p>
            <p>{stage.detail}</p>
            {pour !== null ? (
              <p className="font-semibold">
                {format(b.pourTo, { amount: amountText(pour, plan.waterUnit) })}
              </p>
            ) : null}
            {next && run.status !== "idle" ? (
              <p className="type-meta">
                {format(b.next, {
                  title: next.title.toLocaleLowerCase("tr"),
                  time: formatClock(state.remaining),
                })}
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {finished ? null : running ? (
          shot ? (
            <Button onClick={stop}>
              <SquareIcon aria-hidden />
              {b.stop}
            </Button>
          ) : (
            <Button onClick={pause}>
              <PauseIcon aria-hidden />
              {b.pause}
            </Button>
          )
        ) : (
          <Button onClick={start}>
            <PlayIcon aria-hidden />
            {run.status === "paused" ? b.resume : b.start}
          </Button>
        )}
        {run.status !== "idle" ? (
          <Button variant="secondary" onClick={reset}>
            <RotateCcwIcon aria-hidden />
            {b.reset}
          </Button>
        ) : null}
        {finished ? (
          <Button asChild variant="secondary">
            <Link href={"/panel/tadim/yeni" as Route} prefetch={false}>
              {b.log}
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="type-label">{b.stages}</h3>
        <ol className="flex flex-col">
          {plan.stages.map((item, index) => {
            const current = !finished && run.status !== "idle" && index === state.index;
            const past = finished || index < state.index;
            const itemPour = scaledPour(plan, item, cups);
            return (
              <li
                key={item.at}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "grid grid-cols-[4.5rem_1fr] gap-x-3 rounded-md px-3 py-2 transition-colors",
                  current && "bg-sunk",
                  past && run.status !== "idle" && "text-ink-3",
                )}
              >
                <span className="pt-0.5 type-figure">
                  {item.cue ? `${b.approx} ` : null}
                  {formatClock(item.at)}
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold">{item.title}</span>
                  {itemPour !== null ? (
                    <span className="type-figure">{amountText(itemPour, plan.waterUnit)}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** A clock that changes once a minute; null while the page is rendered on the server. */
function subscribeMinutes(onChange: () => void) {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000);
const noMinute = () => null;

/** "08:30" in the reader's own time. */
const clockTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

/** "bugün" or "yarın", counted from `today` (a steep is never longer than a day). */
function dayWord(date: Date, today: Date): string {
  return date.toDateString() === today.toDateString() ? b.today : b.tomorrow;
}

/** A cold brew: no clock to follow, the hours it is ready between if set up now. */
function SteepAssistant({ plan }: { plan: SteepPlan }) {
  const minute = useSyncExternalStore(subscribeMinutes, currentMinute, noMinute);
  if (minute === null) return null;
  const now = new Date(minute * 60_000);
  const { from, to } = readyWindow(plan, now);
  return (
    <div className="flex flex-col gap-2 rounded-md bg-sunk p-4">
      <p className="type-card-title">
        {format(b.steepReady, {
          fromDay: dayWord(from, now),
          from: clockTime(from),
          toDay: dayWord(to, now),
          to: clockTime(to),
        })}
      </p>
      <p className="type-meta">{b.steepNote}</p>
    </div>
  );
}

/**
 * The brewing assistant under a guide's recipe: the recipe for one or more cups, then a
 * clock that walks through the guide's steps (or, for a cold brew, when it will be ready).
 */
export function BrewAssistant({ plan }: { plan: BrewPlan }) {
  const lead = plan.kind === "steep" ? b.leadSteep : plan.shot ? b.leadShot : b.lead;
  return (
    <section
      aria-labelledby="demleme-asistani"
      className="mb-8 flex flex-col gap-6 rounded-lg border border-line bg-surface p-4 md:p-6"
    >
      <div className="flex flex-col gap-2">
        <h2 id="demleme-asistani" className="type-card-title">
          {b.title}
        </h2>
        <p className="text-ink-2">{lead}</p>
      </div>
      {plan.kind === "steep" ? <SteepAssistant plan={plan} /> : <TimedAssistant plan={plan} />}
    </section>
  );
}
