"use client";

import {
  BRAND_INTENSITY_MAX,
  BRAND_NAME_MAX_LENGTH,
  CAPSULE_SYSTEMS,
  COFFEE_FORMS,
  COFFEE_NAME_MAX_LENGTH,
  DEVICE_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  SCORE_MAX,
  SCORE_MIN,
  TASTE_DIMENSIONS,
  TASTE_MAX,
  TASTE_MIN,
  TASTING_VISIBILITIES,
} from "@espressoir/core";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import { SectionHeading } from "@/components/site/section-heading";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { TastingFormState } from "@/app/(account)/panel/actions";

import { CoffeePicker, SimilarCoffees, type CoffeeOption } from "./coffee-picker";

const f = t.panel.form;
const SCORES = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i);
const TASTE_LEVELS = Array.from({ length: TASTE_MAX - TASTE_MIN + 1 }, (_, i) => TASTE_MIN + i);

export interface TastingFormOptions {
  coffees: { id: string; label: string }[];
  brands: string[];
  brewMethods: { slug: string; name: string }[];
  devices: string[];
  origins: { code: string; name: string }[];
}

/** A row of mutually exclusive choices drawn as boxes (large enough to tap with a thumb). */
function Choices({
  name,
  legend,
  options,
  value,
  onChange,
  defaultValue,
  columns,
}: {
  name: string;
  legend: string;
  options: readonly { value: string; label: string }[];
  /** Controlled (with onChange) when other fields depend on the choice. */
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  columns: string;
}) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="label-caps mb-1.5 text-muted-foreground">{legend}</legend>
      <div className={cn("grid gap-1.5", columns)}>
        {options.map((option) => (
          <label key={option.value} className="relative">
            <input
              type="radio"
              name={name}
              value={option.value}
              className="peer sr-only"
              {...(onChange
                ? { checked: value === option.value, onChange: () => onChange(option.value) }
                : { defaultChecked: defaultValue === option.value })}
            />
            <span className="grid h-11 cursor-pointer place-items-center border border-input px-2 text-center font-mono text-sm peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The tasting form, for a new tasting or an existing one. With `editing`, the coffee is
 * fixed and shown as text. Mobile-first: one column, big targets, the score as ten boxes.
 */
export function TastingForm({
  action,
  options,
  initial,
  today,
  editing,
}: {
  action: (state: TastingFormState, formData: FormData) => Promise<TastingFormState>;
  options: TastingFormOptions;
  /** Starting values by field name. */
  initial: Record<string, string>;
  today: string;
  editing?: { coffeeLabel: string };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // After a failed submit the form shows what was typed, not the original values.
  const value = (name: string) => state.values?.[name] ?? initial[name] ?? "";
  const error = (name: string) => state.errors?.[name];

  const [coffeeMode, setCoffeeMode] = useState(
    value("coffeeMode") || (options.coffees.length > 0 ? "existing" : "new"),
  );
  // The coffee chosen from the catalog; after a failed submit it is found again by its id.
  const [picked, setPicked] = useState<CoffeeOption | null>(
    () => options.coffees.find((coffee) => coffee.id === value("coffeeId")) ?? null,
  );
  // Mirrors of the two "new coffee" names, for the duplicate check next to them.
  const [brandName, setBrandName] = useState(value("brandName"));
  const [coffeeName, setCoffeeName] = useState(value("coffeeName"));
  const [status, setStatus] = useState(value("status") || "logged");
  const [coffeeForm, setCoffeeForm] = useState(value("form"));
  const logged = status === "logged";
  // Open the optional section when it already holds something.
  const hasDetails =
    [...TASTE_DIMENSIONS, "wouldBuyAgain", "pricePaid"].some((name) => value(name) !== "") ||
    (value("visibility") || "public") !== "public";

  return (
    <form action={formAction} className="max-w-2xl pb-10">
      <SectionHeading index={1} title={f.coffeeSection} />
      <div className="grid gap-5 border-b border-border py-5">
        {editing ? (
          <>
            <p className="font-semiwide text-xl font-bold">{editing.coffeeLabel}</p>
            <input type="hidden" name="coffeeMode" value="existing" />
            <input type="hidden" name="coffeeId" value={value("coffeeId")} />
          </>
        ) : (
          <>
            <Choices
              name="coffeeMode"
              legend={f.coffeeMode}
              columns="grid-cols-2"
              value={coffeeMode}
              onChange={setCoffeeMode}
              options={[
                { value: "existing", label: f.existingCoffee },
                { value: "new", label: f.newCoffee },
              ]}
            />
            {coffeeMode === "existing" ? (
              <CoffeePicker
                catalog={options.coffees}
                picked={picked}
                onPick={setPicked}
                onAddNew={(query) => {
                  setCoffeeName(query);
                  setCoffeeMode("new");
                }}
                error={error("coffeeId")}
              />
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label={f.brandName}
                    htmlFor="brandName"
                    hint={f.brandHint}
                    error={error("brandName")}
                  >
                    <Input
                      id="brandName"
                      name="brandName"
                      list="brand-options"
                      autoComplete="off"
                      maxLength={BRAND_NAME_MAX_LENGTH}
                      value={brandName}
                      onChange={(event) => setBrandName(event.target.value)}
                      aria-invalid={Boolean(error("brandName"))}
                    />
                    <datalist id="brand-options">
                      {options.brands.map((brand) => (
                        <option key={brand} value={brand} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label={f.coffeeName} htmlFor="coffeeName" error={error("coffeeName")}>
                    <Input
                      id="coffeeName"
                      name="coffeeName"
                      autoComplete="off"
                      maxLength={COFFEE_NAME_MAX_LENGTH}
                      value={coffeeName}
                      onChange={(event) => setCoffeeName(event.target.value)}
                      aria-invalid={Boolean(error("coffeeName"))}
                    />
                  </Field>
                </div>
                <SimilarCoffees
                  brandName={brandName}
                  coffeeName={coffeeName}
                  catalog={options.coffees}
                  onPick={(coffee) => {
                    setPicked(coffee);
                    setCoffeeMode("existing");
                  }}
                />
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                  <Field label={f.form} htmlFor="form" className="col-span-2 sm:col-span-1">
                    <Select
                      id="form"
                      name="form"
                      value={coffeeForm}
                      onChange={(event) => setCoffeeForm(event.target.value)}
                    >
                      <option value="">{f.unknown}</option>
                      {COFFEE_FORMS.map((form) => (
                        <option key={form} value={form}>
                          {t.coffee.forms[form]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {coffeeForm === "capsule" ? (
                    <Field
                      label={f.capsuleSystem}
                      htmlFor="capsuleSystem"
                      className="col-span-2 sm:col-span-1"
                    >
                      <Select
                        id="capsuleSystem"
                        name="capsuleSystem"
                        defaultValue={value("capsuleSystem")}
                      >
                        <option value="">{f.unknown}</option>
                        {CAPSULE_SYSTEMS.map((system) => (
                          <option key={system} value={system}>
                            {t.coffee.capsuleSystems[system]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : null}
                  <Field label={f.intensity} htmlFor="brandIntensity" hint={f.intensityHint}>
                    <Input
                      id="brandIntensity"
                      name="brandIntensity"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={BRAND_INTENSITY_MAX}
                      defaultValue={value("brandIntensity")}
                    />
                  </Field>
                  <Field label={f.origin} htmlFor="originCountry">
                    <Select
                      id="originCountry"
                      name="originCountry"
                      defaultValue={value("originCountry")}
                    >
                      <option value="">{f.unknown}</option>
                      {options.origins.map((origin) => (
                        <option key={origin.code} value={origin.code}>
                          {origin.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <SectionHeading index={2} title={f.tastingSection} />
      <div className="grid gap-5 border-b border-border py-5">
        <Choices
          name="status"
          legend={f.status}
          columns="grid-cols-2"
          value={status}
          onChange={setStatus}
          options={[
            { value: "logged", label: f.statusLogged },
            { value: "wishlist", label: f.statusWishlist },
          ]}
        />

        {logged ? (
          <>
            <Choices
              name="score"
              legend={f.score}
              columns="grid-cols-6 sm:grid-cols-11"
              defaultValue={value("score")}
              options={[
                ...SCORES.map((score) => ({ value: String(score), label: String(score) })),
                { value: "", label: "–" },
              ]}
            />
            {error("score") ? (
              <p role="alert" className="font-mono text-xs text-destructive">
                {error("score")}
              </p>
            ) : null}
            <Field label={f.date} htmlFor="tastedAt" error={error("tastedAt")} className="max-w-56">
              <Input
                id="tastedAt"
                name="tastedAt"
                type="date"
                max={today}
                defaultValue={value("tastedAt")}
                aria-invalid={Boolean(error("tastedAt"))}
              />
            </Field>
          </>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={f.method} htmlFor="brewMethodSlug">
            <Select
              id="brewMethodSlug"
              name="brewMethodSlug"
              defaultValue={value("brewMethodSlug")}
            >
              <option value="">{f.unknown}</option>
              {options.brewMethods.map((method) => (
                <option key={method.slug} value={method.slug}>
                  {method.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.device} htmlFor="device" hint={f.deviceHint}>
            <Input
              id="device"
              name="device"
              list="device-options"
              autoComplete="off"
              maxLength={DEVICE_MAX_LENGTH}
              defaultValue={value("device")}
            />
            <datalist id="device-options">
              {options.devices.map((device) => (
                <option key={device} value={device} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field
          label={f.notes}
          htmlFor="notes"
          hint={format(f.notesHint, { max: NOTES_MAX_LENGTH })}
          error={error("notes")}
        >
          <Textarea
            id="notes"
            name="notes"
            maxLength={NOTES_MAX_LENGTH}
            defaultValue={value("notes")}
            aria-invalid={Boolean(error("notes"))}
          />
        </Field>
      </div>

      <details className="border-b border-border" open={hasDetails || undefined}>
        <summary className="cursor-pointer py-4 font-mono text-xs font-medium tracking-wide uppercase focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
          03 — {f.detailsSection}
        </summary>
        <div className="grid gap-5 pb-5">
          <fieldset>
            <legend className="label-caps text-muted-foreground">{f.tasteHint}</legend>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-5">
              {TASTE_DIMENSIONS.map((dimension) => (
                <div key={dimension} className="grid gap-1.5">
                  <Label htmlFor={dimension}>{f.taste[dimension]}</Label>
                  <Select id={dimension} name={dimension} defaultValue={value(dimension)}>
                    <option value="">{f.tasteNone}</option>
                    {TASTE_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label={f.wouldBuyAgain} htmlFor="wouldBuyAgain">
              <Select id="wouldBuyAgain" name="wouldBuyAgain" defaultValue={value("wouldBuyAgain")}>
                <option value="">{f.unknown}</option>
                <option value="yes">{f.yes}</option>
                <option value="no">{f.no}</option>
              </Select>
            </Field>
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

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="submit" disabled={pending} className="h-11 px-8 font-mono text-xs uppercase">
          {pending ? f.saving : f.save}
        </Button>
        <Button asChild variant="outline" className="h-11 font-mono text-xs uppercase">
          <Link href="/panel">{f.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
