"use client";

import {
  BRAND_INTENSITY_MAX,
  BRAND_NAME_MAX_LENGTH,
  CAPSULE_SYSTEMS,
  COFFEE_FORMS,
  COFFEE_NAME_MAX_LENGTH,
  DEVICE_MAX_LENGTH,
  FLAVOR_GROUPS,
  FLAVOR_TAGS_MAX,
  NOTES_MAX_LENGTH,
  SCORE_MAX,
  SCORE_MIN,
  TASTE_DIMENSIONS,
  TASTE_MAX,
  TASTE_MIN,
  TASTING_VISIBILITIES,
  type FlavorGroup,
} from "@espressoir/core";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import { SectionHeading } from "@/components/site/section-heading";
import { submitWithoutReset } from "@/lib/form-submit";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import type { TastingFormState } from "@/app/(account)/panel/actions";

import { Choices } from "./choices";
import { CoffeePicker, SimilarCoffees, type CoffeeOption } from "./coffee-picker";
import { PhotoField } from "./photo-field";

const f = t.panel.form;
const SCORES = Array.from({ length: SCORE_MAX - SCORE_MIN + 1 }, (_, i) => SCORE_MIN + i);
const TASTE_LEVELS = Array.from({ length: TASTE_MAX - TASTE_MIN + 1 }, (_, i) => TASTE_MIN + i);

export interface TastingFormOptions {
  coffees: { id: string; label: string }[];
  /** The member's own most recent coffees, newest first: one tap away in a new tasting. */
  recent?: { id: string; label: string }[];
  brands: string[];
  brewMethods: { slug: string; name: string }[];
  devices: string[];
  flavorTags: FlavorTagOption[];
  origins: { code: string; name: string }[];
}

interface FlavorTagOption {
  slug: string;
  name: string;
  group: FlavorGroup;
}

/**
 * The flavour tags as boxes to tick, family by family. Plain checkboxes, so the form
 * also submits without JavaScript; with it, the boxes that are left go quiet once the
 * limit is reached (the server and the database enforce the same limit).
 */
function FlavorTagPicker({
  tags,
  initial,
}: {
  tags: readonly FlavorTagOption[];
  initial: readonly string[];
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(initial));
  const full = selected.size >= FLAVOR_TAGS_MAX;
  const toggle = (slug: string, on: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(slug);
      else next.delete(slug);
      return next;
    });

  return (
    <fieldset>
      <legend className="label-caps text-muted-foreground">{f.flavorTags}</legend>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {format(f.flavorTagsHint, { max: FLAVOR_TAGS_MAX })}{" "}
        <span aria-live="polite" className={cn(full && "text-foreground")}>
          {format(f.flavorTagsCount, { count: selected.size, max: FLAVOR_TAGS_MAX })}
        </span>
      </p>
      <div className="mt-3 grid gap-3">
        {FLAVOR_GROUPS.map((group) => {
          const inGroup = tags.filter((tag) => tag.group === group);
          if (inGroup.length === 0) return null;
          return (
            <div
              key={group}
              role="group"
              aria-label={t.taste.groups[group]}
              className="grid gap-1.5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:items-start"
            >
              <p className="font-mono text-xs text-muted-foreground sm:pt-2.5">
                {t.taste.groups[group]}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {inGroup.map((tag) => {
                  const checked = selected.has(tag.slug);
                  return (
                    <label key={tag.slug} className="relative">
                      <input
                        type="checkbox"
                        name="flavorTagSlugs"
                        value={tag.slug}
                        checked={checked}
                        disabled={full && !checked}
                        onChange={(event) => toggle(tag.slug, event.target.checked)}
                        className="peer sr-only"
                      />
                      <span className="grid h-10 cursor-pointer place-items-center border border-input px-3 font-mono text-sm peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-40">
                        {tag.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
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
    [...TASTE_DIMENSIONS, "flavorTagSlugs", "photoPath", "wouldBuyAgain", "pricePaid"].some(
      (name) => value(name) !== "",
    ) || (value("visibility") || "public") !== "public";

  return (
    <form action={formAction} onSubmit={submitWithoutReset(formAction)} className="max-w-2xl pb-10">
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
            {coffeeMode === "existing" && !picked && options.recent?.length ? (
              // The quickest way in: what the member had last time, one tap each.
              <fieldset className="grid gap-1.5">
                <legend className="label-caps mb-1.5 text-muted-foreground">{f.recent}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {options.recent.map((coffee) => (
                    <button
                      key={coffee.id}
                      type="button"
                      onClick={() => setPicked(coffee)}
                      className="min-h-11 border border-input px-3 py-2 text-left text-sm hover:border-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {coffee.label}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}
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
          {/* A coffee on the wishlist has not been tasted: nothing to tag yet. */}
          {logged && options.flavorTags.length > 0 ? (
            <FlavorTagPicker
              tags={options.flavorTags}
              initial={value("flavorTagSlugs").split(",").filter(Boolean)}
            />
          ) : null}
          {/* Like the tags: a picture belongs to a tasting that has happened. */}
          {logged ? (
            <PhotoField
              initial={
                value("photoPath")
                  ? {
                      path: value("photoPath"),
                      width: Number(value("photoWidth")),
                      height: Number(value("photoHeight")),
                    }
                  : null
              }
              initialAlt={value("photoAlt")}
            />
          ) : null}
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

      {/* On a phone the save button stays at the bottom of the screen, within the thumb's
          reach, whatever is open above it; clear of the home bar when opened as an app. */}
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
