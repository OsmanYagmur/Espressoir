"use client";

import {
  CAFE_DISTRICT_MAX_LENGTH,
  CAFE_DRINKS,
  CAFE_DRINK_NAME_MAX_LENGTH,
  CAFE_MAP_URL_MAX_LENGTH,
  CAFE_NAME_MAX_LENGTH,
  CAFE_VISIT_NOTES_MAX_LENGTH,
  SCORE_MAX,
  SCORE_MIN,
  TASTING_VISIBILITIES,
} from "@espressoir/core";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SectionHeading } from "@/components/site/section-heading";
import { format, t } from "@/lib/i18n";

import type { CafeVisitFormState } from "@/app/(account)/panel/kafe/actions";

import { CafePicker, SimilarCafes, type CafeOption } from "./cafe-picker";
import { Choices } from "./choices";

const f = t.cafes.panel;
const SCORES = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i);

export interface CafeVisitFormOptions {
  /** Every café, for the offline search and to find a chosen café again by its id. */
  cafes: CafeOption[];
  /** The 81 provinces, by plate number. */
  cities: { code: number; name: string }[];
}

/**
 * A drink at a café, new or edited. Like the tasting form: mobile-first, the café first
 * (search, or a new one with the look-alike check), then the drink as boxes, the score as
 * ten boxes, a note; the rest folded under "details". With `editing`, the café is fixed.
 */
export function CafeVisitForm({
  action,
  options,
  initial,
  today,
  editing,
}: {
  action: (state: CafeVisitFormState, formData: FormData) => Promise<CafeVisitFormState>;
  options: CafeVisitFormOptions;
  /** Starting values by field name. */
  initial: Record<string, string>;
  today: string;
  editing?: { cafeLabel: string };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // After a failed submit the form shows what was typed, not the original values.
  const value = (name: string) => state.values?.[name] ?? initial[name] ?? "";
  const error = (name: string) => state.errors?.[name];

  const [cafeMode, setCafeMode] = useState(
    value("cafeMode") || (options.cafes.length > 0 ? "existing" : "new"),
  );
  const [picked, setPicked] = useState<CafeOption | null>(
    () => options.cafes.find((cafe) => cafe.id === value("cafeId")) ?? null,
  );
  // Mirrors of the new café's name and city, for the look-alike check beside them.
  const [name, setName] = useState(value("cafeName"));
  const [cityCode, setCityCode] = useState(value("cityCode"));
  const hasDetails =
    ["pricePaid"].some((field) => value(field) !== "") ||
    (value("visibility") || "public") !== "public";

  return (
    <form action={formAction} className="max-w-2xl pb-10">
      <SectionHeading index={1} title={f.cafeSection} />
      <div className="grid gap-5 border-b border-border py-5">
        {editing ? (
          <>
            <p className="font-semiwide text-xl font-bold">{editing.cafeLabel}</p>
            <input type="hidden" name="cafeMode" value="existing" />
            <input type="hidden" name="cafeId" value={value("cafeId")} />
          </>
        ) : (
          <>
            <Choices
              name="cafeMode"
              legend={f.cafeMode}
              columns="grid-cols-2"
              value={cafeMode}
              onChange={setCafeMode}
              options={[
                { value: "existing", label: f.existingCafe },
                { value: "new", label: f.newCafe },
              ]}
            />
            {cafeMode === "existing" ? (
              <CafePicker
                catalog={options.cafes}
                picked={picked}
                onPick={setPicked}
                onAddNew={(query) => {
                  setName(query);
                  setCafeMode("new");
                }}
                error={error("cafeId")}
              />
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={f.name} htmlFor="cafeName" error={error("name")}>
                    <Input
                      id="cafeName"
                      name="cafeName"
                      autoComplete="off"
                      maxLength={CAFE_NAME_MAX_LENGTH}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      aria-invalid={Boolean(error("name"))}
                    />
                  </Field>
                  <Field label={f.city} htmlFor="cityCode" error={error("cityCode")}>
                    <Select
                      id="cityCode"
                      name="cityCode"
                      value={cityCode}
                      onChange={(event) => setCityCode(event.target.value)}
                      aria-invalid={Boolean(error("cityCode"))}
                    >
                      <option value="">{f.chooseCity}</option>
                      {options.cities.map((city) => (
                        <option key={city.code} value={city.code}>
                          {city.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <SimilarCafes
                  name={name}
                  cityCode={cityCode === "" ? null : Number(cityCode)}
                  catalog={options.cafes}
                  onPick={(cafe) => {
                    setPicked(cafe);
                    setCafeMode("existing");
                  }}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label={f.district}
                    htmlFor="district"
                    hint={f.districtHint}
                    error={error("district")}
                  >
                    <Input
                      id="district"
                      name="district"
                      autoComplete="off"
                      maxLength={CAFE_DISTRICT_MAX_LENGTH}
                      defaultValue={value("district")}
                    />
                  </Field>
                  <Field
                    label={f.mapUrl}
                    htmlFor="mapUrl"
                    hint={f.mapUrlHint}
                    error={error("mapUrl")}
                  >
                    <Input
                      id="mapUrl"
                      name="mapUrl"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      maxLength={CAFE_MAP_URL_MAX_LENGTH}
                      defaultValue={value("mapUrl")}
                      aria-invalid={Boolean(error("mapUrl"))}
                    />
                  </Field>
                </div>
                <p className="font-mono text-xs text-muted-foreground">{f.newCafeNote}</p>
              </>
            )}
          </>
        )}
      </div>

      <SectionHeading index={2} title={f.drinkSection} />
      <div className="grid gap-5 border-b border-border py-5">
        <Choices
          name="drink"
          legend={f.drink}
          columns="grid-cols-2 sm:grid-cols-3"
          defaultValue={value("drink")}
          options={CAFE_DRINKS.map((drink) => ({ value: drink, label: t.cafes.drinks[drink] }))}
        />
        {error("drink") ? (
          <p role="alert" className="font-mono text-xs text-destructive">
            {error("drink")}
          </p>
        ) : null}
        <Field label={f.drinkName} htmlFor="drinkName" hint={f.drinkNameHint}>
          <Input
            id="drinkName"
            name="drinkName"
            autoComplete="off"
            maxLength={CAFE_DRINK_NAME_MAX_LENGTH}
            defaultValue={value("drinkName")}
          />
        </Field>
        <Choices
          name="score"
          legend={f.score}
          columns="grid-cols-5 sm:grid-cols-10"
          defaultValue={value("score")}
          options={SCORES.map((score) => ({ value: String(score), label: String(score) }))}
        />
        {error("score") ? (
          <p role="alert" className="font-mono text-xs text-destructive">
            {error("score")}
          </p>
        ) : null}
        <Field label={f.date} htmlFor="visitedOn" error={error("visitedOn")} className="max-w-56">
          <Input
            id="visitedOn"
            name="visitedOn"
            type="date"
            max={today}
            defaultValue={value("visitedOn")}
            aria-invalid={Boolean(error("visitedOn"))}
          />
        </Field>
        <Field
          label={f.notes}
          htmlFor="notes"
          hint={format(t.panel.form.notesHint, { max: CAFE_VISIT_NOTES_MAX_LENGTH })}
          error={error("notes")}
        >
          <Textarea
            id="notes"
            name="notes"
            maxLength={CAFE_VISIT_NOTES_MAX_LENGTH}
            defaultValue={value("notes")}
            aria-invalid={Boolean(error("notes"))}
          />
        </Field>
      </div>

      <details className="border-b border-border" open={hasDetails || undefined}>
        <summary className="cursor-pointer py-4 font-mono text-xs font-medium tracking-wide uppercase focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
          03 — {f.detailsSection}
        </summary>
        <div className="grid gap-5 pb-5 sm:grid-cols-2">
          <Field label={f.price} htmlFor="pricePaid" error={error("pricePaid")}>
            <Input
              id="pricePaid"
              name="pricePaid"
              inputMode="decimal"
              autoComplete="off"
              defaultValue={value("pricePaid")}
              aria-invalid={Boolean(error("pricePaid"))}
            />
          </Field>
          <Field label={f.visibility} htmlFor="visibility">
            <Select
              id="visibility"
              name="visibility"
              defaultValue={value("visibility") || "public"}
            >
              {TASTING_VISIBILITIES.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {t.panel.visibility[visibility]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </details>

      {state.message ? (
        <p
          role="alert"
          className="mt-5 border-l-2 border-destructive pl-3 font-mono text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : null}

      {/* As in the tasting form: on a phone the save button stays within the thumb's reach. */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-6 flex flex-wrap gap-3 border-t border-rule bg-background px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:mx-0 sm:border-0 sm:p-0">
        <Button
          type="submit"
          disabled={pending}
          className="h-11 flex-1 px-8 font-mono text-xs uppercase sm:flex-none"
        >
          {pending ? f.saving : f.save}
        </Button>
        <Button asChild variant="outline" className="h-11 font-mono text-xs uppercase">
          <Link href="/panel">{f.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
