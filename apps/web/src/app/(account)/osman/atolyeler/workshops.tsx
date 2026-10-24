import {
  WORKSHOP_CAPACITY_MAX,
  WORKSHOP_LOCATION_MAX_LENGTH,
  WORKSHOP_PRICE_MAX_LENGTH,
  WORKSHOP_STATUSES,
  WORKSHOP_TITLE_MAX_LENGTH,
} from "@espressoir/core";
import {
  workshopApplicationRowSchema,
  workshopRowSchema,
  type TypedSupabaseClient,
  type Workshop,
  type WorkshopApplication,
} from "@espressoir/db";
import type { Route } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Select } from "@/components/ui/field";
import { Capacity } from "@/components/workshop/event-card";
import { WORKSHOP_PROGRAMS } from "@/content/atolye";
import { formatLongDay } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { workshopFormValues, workshopWhen } from "@/lib/workshop-format";

import { deleteApplication, saveWorkshop, setApplicationStatus } from "./workshop-actions";

const w = t.admin.workshops;

/** Add a workshop (without `workshop`) or change one. A plain form: works without JavaScript. */
function WorkshopForm({ workshop }: { workshop?: Workshop }) {
  const prefix = workshop?.id ?? "yeni";
  const fieldId = (name: string) => `atolye-${prefix}-${name}`;
  const times = workshop ? workshopFormValues(workshop) : null;
  return (
    <form action={saveWorkshop} className="mt-4 grid gap-4 sm:grid-cols-2">
      {workshop ? <input type="hidden" name="workshopId" value={workshop.id} /> : null}
      <Field label={w.fields.title} htmlFor={fieldId("title")} className="sm:col-span-2">
        <Input
          id={fieldId("title")}
          name="workshopTitle"
          required
          maxLength={WORKSHOP_TITLE_MAX_LENGTH}
          defaultValue={workshop?.title}
        />
      </Field>
      <Field
        label={w.fields.program}
        htmlFor={fieldId("program")}
        hint={w.fields.programHint}
        className="sm:col-span-2"
      >
        <Select id={fieldId("program")} name="program" defaultValue={workshop?.program}>
          {Object.entries(WORKSHOP_PROGRAMS).map(([key, program]) => (
            <option key={key} value={key}>
              {program.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={w.fields.day} htmlFor={fieldId("day")}>
        <Input id={fieldId("day")} name="day" type="date" required defaultValue={times?.day} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={w.fields.start} htmlFor={fieldId("start")}>
          <Input
            id={fieldId("start")}
            name="startTime"
            type="time"
            required
            defaultValue={times?.startTime}
          />
        </Field>
        <Field label={w.fields.end} htmlFor={fieldId("end")}>
          <Input
            id={fieldId("end")}
            name="endTime"
            type="time"
            required
            defaultValue={times?.endTime}
          />
        </Field>
      </div>
      <Field label={w.fields.capacity} htmlFor={fieldId("capacity")}>
        <Input
          id={fieldId("capacity")}
          name="capacity"
          type="number"
          inputMode="numeric"
          min={1}
          max={WORKSHOP_CAPACITY_MAX}
          required
          defaultValue={workshop?.capacity ?? 8}
        />
      </Field>
      <Field label={w.fields.price} htmlFor={fieldId("price")} hint={w.fields.priceHint}>
        <Input
          id={fieldId("price")}
          name="priceText"
          required
          maxLength={WORKSHOP_PRICE_MAX_LENGTH}
          defaultValue={workshop?.priceText}
        />
      </Field>
      <Field
        label={w.fields.location}
        htmlFor={fieldId("location")}
        hint={w.fields.locationHint}
        className="sm:col-span-2"
      >
        <Input
          id={fieldId("location")}
          name="locationText"
          maxLength={WORKSHOP_LOCATION_MAX_LENGTH}
          defaultValue={workshop?.locationText ?? ""}
        />
      </Field>
      <label className="flex items-center gap-3 sm:col-span-2">
        <input
          type="checkbox"
          name="isOpen"
          defaultChecked={workshop?.isOpen ?? true}
          className="size-4.5 accent-accent"
        />
        {w.fields.isOpen}
      </label>
      <Button type="submit" variant="secondary" className="justify-self-start">
        {workshop ? w.save : w.create}
      </Button>
    </form>
  );
}

function Application({ application }: { application: WorkshopApplication }) {
  return (
    <li className="grid gap-3 border-b border-line py-4">
      <div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold [overflow-wrap:anywhere]">{application.name}</span>
          <span className="[overflow-wrap:anywhere]">{application.contact}</span>
          <Chip>{w.statuses[application.status]}</Chip>
        </p>
        <p className="type-meta">
          {t.workshop.form.experiences[application.experience].title} ·{" "}
          {format(w.received, { date: formatLongDay(application.createdAt.slice(0, 10)) })}
        </p>
        {application.question ? (
          // Plain text, escaped by React.
          <p className="mt-2 rounded-md bg-sunk p-4 [overflow-wrap:anywhere] whitespace-pre-line">
            <span className="sr-only">{w.question}: </span>
            {application.question}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <form action={setApplicationStatus} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="applicationId" value={application.id} />
          <Select
            name="status"
            aria-label={`${w.status}: ${application.name}`}
            defaultValue={application.status}
            className="h-10 w-40"
          >
            {WORKSHOP_STATUSES.map((status) => (
              <option key={status} value={status}>
                {w.statuses[status]}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" size="sm">
            {w.setStatus}
          </Button>
        </form>
        <form action={deleteApplication} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="applicationId" value={application.id} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="sure" required className="accent-accent" />
            {t.admin.sure}
          </label>
          <Button type="submit" variant="secondary" size="sm">
            {w.remove}
          </Button>
        </form>
      </div>
    </li>
  );
}

/**
 * The workshops and their applications. Applications are read here and nowhere else: row
 * level security shows them to admins only, and this page runs as the signed-in admin.
 */
export async function WorkshopsAdmin({ supabase }: { supabase: TypedSupabaseClient }) {
  const [workshops, applications] = await Promise.all([
    supabase.from("workshop_overview").select("*").order("starts_at", { ascending: false }),
    supabase
      .from("workshop_applications")
      .select("id, workshop_id, name, contact, experience, question, status, created_at")
      .order("created_at"),
  ]);
  // A database without workshops yet (code deployed before its migration): the form alone.
  const rows = workshops.error ? [] : workshops.data.map((row) => workshopRowSchema.parse(row));
  const received = applications.error
    ? []
    : applications.data.map((row) => workshopApplicationRowSchema.parse(row));

  return (
    <div className="flex flex-col gap-4">
      {rows.length === 0 ? <p className="text-ink-2">{w.empty}</p> : null}
      {rows.map((workshop) => {
        const mine = received.filter((application) => application.workshopId === workshop.id);
        return (
          <article key={workshop.id} className={cn(cardClass, "flex flex-col gap-4")}>
            <div className="flex flex-col gap-2">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="type-card-title">{workshop.title}</span>
                <Chip>{workshop.isOpen ? w.open : w.closed}</Chip>
              </p>
              <p className="type-meta">
                {workshopWhen(workshop).full}
                {workshop.locationText ? ` · ${workshop.locationText}` : null} ·{" "}
                {workshop.priceText}
              </p>
              <Capacity workshop={workshop} />
              {/* Not fetched ahead: saving here changes that very page. */}
              <Link
                href={`/atolye/${workshop.id}` as Route}
                prefetch={false}
                className="self-start text-accent-ink underline underline-offset-3"
              >
                {t.admin.open}
              </Link>
            </div>
            <details>
              <summary className="cursor-pointer font-medium text-accent-ink">{w.edit}</summary>
              <WorkshopForm workshop={workshop} />
            </details>
            <div>
              <p className="mb-2 type-label">
                {w.applicationsTitle}{" "}
                <span className="type-figure font-normal text-ink-2">{mine.length}</span>
              </p>
              {mine.length === 0 ? (
                <p className="text-ink-2">{w.applicationsEmpty}</p>
              ) : (
                <ul aria-label={w.applicationsTitle} className="border-t border-line">
                  {mine.map((application) => (
                    <Application key={application.id} application={application} />
                  ))}
                </ul>
              )}
            </div>
          </article>
        );
      })}
      <details className={cardClass}>
        <summary className="cursor-pointer font-medium text-accent-ink">{w.newTitle}</summary>
        <WorkshopForm />
      </details>
    </div>
  );
}
