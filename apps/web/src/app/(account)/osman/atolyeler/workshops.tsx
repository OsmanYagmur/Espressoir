import {
  WORKSHOP_CAPACITY_MAX,
  WORKSHOP_CONTACT_MAX_LENGTH,
  WORKSHOP_EXPERIENCES,
  WORKSHOP_LOCATION_MAX_LENGTH,
  WORKSHOP_NAME_MAX_LENGTH,
  WORKSHOP_PRICE_MAX_LENGTH,
  WORKSHOP_QUESTION_MAX_LENGTH,
  WORKSHOP_STATUSES,
  WORKSHOP_TITLE_MAX_LENGTH,
  siteConfig,
  summarizeApplications,
  whatsappNumber,
  type WorkshopStatus,
} from "@espressoir/core";
import type { Workshop, WorkshopApplication } from "@espressoir/db";
import {
  CheckIcon,
  HourglassIcon,
  ListPlusIcon,
  UserCheckIcon,
  UserXIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { FieldStrip } from "@/components/site/field-strip";
import { BarTable } from "@/components/stats/bar-table";
import { DayColumns } from "@/components/stats/day-columns";
import { Button } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Capacity } from "@/components/workshop/event-card";
import { WORKSHOP_PROGRAMS } from "@/content/atolye";
import { formatLongDay, formatPercent } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import { workshopFormValues, workshopWhen } from "@/lib/workshop-format";

import {
  addApplicant,
  deleteApplication,
  saveWorkshop,
  setApplicationStatus,
  setAttendance,
} from "./actions";
import { CopyLinkButton, WhatsAppButton } from "./message-buttons";

const w = t.admin.workshops;
const experiences = t.workshop.form.experiences;
const link = "text-accent-ink underline underline-offset-3";

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

/**
 * A person added from the panel: the form's fields and the status chosen. The control is
 * `applicantName`, not `name`: a control named after a property of its form replaces it.
 */
function AddApplicantForm({ workshopId }: { workshopId: string }) {
  const fieldId = (name: string) => `kisi-${workshopId}-${name}`;
  const f = w.addFields;
  return (
    <form action={addApplicant} className="mt-4 grid gap-4 sm:grid-cols-2">
      <p className="text-ink-2 sm:col-span-2">{w.addHint}</p>
      <input type="hidden" name="workshopId" value={workshopId} />
      <Field label={f.name} htmlFor={fieldId("name")}>
        <Input
          id={fieldId("name")}
          name="applicantName"
          required
          maxLength={WORKSHOP_NAME_MAX_LENGTH}
          autoComplete="off"
        />
      </Field>
      <Field label={f.contact} htmlFor={fieldId("contact")} hint={f.contactHint}>
        <Input
          id={fieldId("contact")}
          name="contact"
          required
          maxLength={WORKSHOP_CONTACT_MAX_LENGTH}
          autoComplete="off"
        />
      </Field>
      <Field label={f.experience} htmlFor={fieldId("experience")}>
        <Select id={fieldId("experience")} name="experience" defaultValue="new">
          {WORKSHOP_EXPERIENCES.map((experience) => (
            <option key={experience} value={experience}>
              {experiences[experience].title}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={w.status} htmlFor={fieldId("status")}>
        <Select id={fieldId("status")} name="status" defaultValue="approved">
          {WORKSHOP_STATUSES.map((status) => (
            <option key={status} value={status}>
              {w.statuses[status]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={f.note} htmlFor={fieldId("note")} className="sm:col-span-2">
        <Textarea
          id={fieldId("note")}
          name="note"
          rows={2}
          maxLength={WORKSHOP_QUESTION_MAX_LENGTH}
        />
      </Field>
      <label className="flex items-start gap-3 sm:col-span-2">
        <input type="checkbox" name="consent" required className="mt-1 size-4.5 accent-accent" />
        {w.addConsent}
      </label>
      <Button type="submit" variant="secondary" className="justify-self-start">
        {w.add}
      </Button>
    </form>
  );
}

/** The answers to an application, one button each; the current one is not offered. */
const ANSWERS: readonly { status: WorkshopStatus; label: string; Icon: LucideIcon }[] = [
  { status: "approved", label: w.answers.approve, Icon: CheckIcon },
  { status: "pending", label: w.answers.hold, Icon: HourglassIcon },
  { status: "waitlist", label: w.answers.waitlist, Icon: ListPlusIcon },
  { status: "rejected", label: w.answers.reject, Icon: XIcon },
];

/** Whether an approved person came: pressed once marks it, pressed again takes it back. */
const ATTENDANCE: readonly { value: "true" | "false"; label: string; Icon: LucideIcon }[] = [
  { value: "true", label: w.attendanceStates.came, Icon: UserCheckIcon },
  { value: "false", label: w.attendanceStates.missed, Icon: UserXIcon },
];

const attendanceValue = (attended: boolean | null) =>
  attended === null ? "" : attended ? "true" : "false";

const rsvpText = w.rsvp;

const stampFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: siteConfig.timeZone,
});

/**
 * For an approved person: whether they answered "are you coming?", when they were asked
 * and reminded, and the WhatsApp messages that carry their personal link (/teyit/<token>).
 */
function RsvpRow({
  application,
  workshop,
}: {
  application: WorkshopApplication;
  workshop: Workshop;
}) {
  if (!application.rsvpToken) return null;
  const link = new URL(`/teyit/${application.rsvpToken}`, getSiteUrl()).href;
  const firstName = application.name.split(" ")[0] ?? application.name;
  const when = workshopWhen(workshop);
  const number = whatsappNumber(application.contact);
  const chat = (text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  const ask = format(rsvpText.messages.ask, {
    name: firstName,
    title: workshop.title,
    when: when.full,
    place: workshop.locationText ? ` · ${workshop.locationText}` : "",
    link,
  });
  const remind = format(rsvpText.messages.remind, {
    name: firstName,
    title: workshop.title,
    time: when.start,
    link,
  });
  const notes = [
    application.rsvpAskedAt
      ? format(rsvpText.asked, { date: stampFormat.format(new Date(application.rsvpAskedAt)) })
      : null,
    application.remindedAt
      ? format(rsvpText.reminded, { date: stampFormat.format(new Date(application.remindedAt)) })
      : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="type-meta">{rsvpText.label}</span>
        <Chip>{rsvpText.states[application.rsvp ?? "none"]}</Chip>
        {notes.length > 0 ? <span className="type-meta">{notes.join(" · ")}</span> : null}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {number ? (
          <>
            <WhatsAppButton
              href={chat(ask)}
              label={rsvpText.ask}
              description={`${application.name}, ${rsvpText.whatsapp}`}
              applicationId={application.id}
              kind="ask"
            />
            {application.rsvp !== "no" ? (
              <WhatsAppButton
                href={chat(remind)}
                label={rsvpText.remind}
                description={`${application.name}, ${rsvpText.whatsapp}`}
                applicationId={application.id}
                kind="remind"
              />
            ) : null}
          </>
        ) : (
          <span className="type-meta">{rsvpText.noPhone}</span>
        )}
        <CopyLinkButton link={link} label={rsvpText.copy} copiedLabel={rsvpText.copied} />
      </div>
    </div>
  );
}

function Application({
  application,
  workshop,
}: {
  application: WorkshopApplication;
  workshop: Workshop;
}) {
  const date = formatLongDay(application.createdAt.slice(0, 10));
  const ids = (
    <>
      <input type="hidden" name="applicationId" value={application.id} />
      <input type="hidden" name="workshopId" value={application.workshopId} />
    </>
  );
  return (
    <li className="grid gap-3 border-b border-line py-4">
      <div>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold [overflow-wrap:anywhere]">{application.name}</span>
          <span className="[overflow-wrap:anywhere]">{application.contact}</span>
          <Chip>{w.statuses[application.status]}</Chip>
          {application.source === "admin" ? <Chip>{w.fromPanel}</Chip> : null}
        </p>
        <p className="type-meta">
          {experiences[application.experience].title} ·{" "}
          {format(application.source === "admin" ? w.added : w.received, { date })}
        </p>
        {application.question ? (
          // Plain text, escaped by React.
          <p className="mt-2 rounded-md bg-sunk p-4 [overflow-wrap:anywhere] whitespace-pre-line">
            <span className="sr-only">{w.question}: </span>
            {application.question}
          </p>
        ) : null}
      </div>
      {application.status === "approved" ? (
        <RsvpRow application={application} workshop={workshop} />
      ) : null}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {/* Each button sends its own answer; the name says whose application it is. */}
        <form action={setApplicationStatus} className="flex flex-wrap items-center gap-2">
          {ids}
          {ANSWERS.filter(({ status }) => status !== application.status).map(
            ({ status, label, Icon }) => (
              <Button
                key={status}
                type="submit"
                name="status"
                value={status}
                variant="secondary"
                size="sm"
                aria-label={`${label}: ${application.name}`}
              >
                <Icon aria-hidden />
                {label}
              </Button>
            ),
          )}
        </form>
        {application.status === "approved" ? (
          <form
            action={setAttendance}
            aria-label={`${w.attendance}: ${application.name}`}
            className="flex flex-wrap items-center gap-2"
          >
            {ids}
            <span className="type-meta">{w.attendance}</span>
            {ATTENDANCE.map(({ value, label, Icon }) => {
              const pressed = attendanceValue(application.attended) === value;
              return (
                <Button
                  key={value}
                  type="submit"
                  name="attended"
                  value={pressed ? "" : value}
                  variant="secondary"
                  size="sm"
                  aria-pressed={pressed}
                  aria-label={`${label}: ${application.name}`}
                  className="aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg aria-pressed:hover:bg-ink"
                >
                  <Icon aria-hidden />
                  {label}
                </Button>
              );
            })}
          </form>
        ) : null}
        <form action={deleteApplication} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="applicationId" value={application.id} />
          <input type="hidden" name="workshopId" value={application.workshopId} />
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

/** How the approved people answered "are you coming?": the count the day's plan rests on. */
function RsvpSummary({ applications }: { applications: readonly WorkshopApplication[] }) {
  const approved = applications.filter(({ status }) => status === "approved");
  if (approved.length === 0) return null;
  const count = (answer: WorkshopApplication["rsvp"]) =>
    approved.filter(({ rsvp }) => rsvp === answer).length;
  return (
    <p className="mb-2 type-meta">
      {format(rsvpText.summary, { yes: count("yes"), no: count("no"), none: count(null) })}
    </p>
  );
}

/** The workshop's numbers: how full, who is waiting, who came, how the applications came in. */
function WorkshopStats({
  workshop,
  applications,
}: {
  workshop: Workshop;
  applications: readonly WorkshopApplication[];
}) {
  const s = w.stats;
  const summary = summarizeApplications(applications, workshop.capacity, siteConfig.timeZone);
  const { came, missed } = summary.attendance;
  return (
    <div className="flex flex-col gap-6">
      <FieldStrip
        fields={[
          {
            label: s.applications,
            value: summary.total,
            note:
              summary.bySource.admin > 0
                ? format(s.fromPanel, { count: summary.bySource.admin })
                : undefined,
          },
          {
            label: s.fill,
            value: formatPercent(summary.fill),
            note: format(s.fillNote, {
              approved: summary.byStatus.approved,
              capacity: workshop.capacity,
            }),
          },
          { label: s.pending, value: summary.byStatus.pending, empty: !summary.byStatus.pending },
          {
            label: s.waitlist,
            value: summary.byStatus.waitlist,
            empty: !summary.byStatus.waitlist,
          },
          {
            label: s.showRate,
            value: summary.showRate === null ? "—" : formatPercent(summary.showRate),
            note: summary.showRate === null ? s.noMarks : format(s.showRateNote, { came, missed }),
            empty: summary.showRate === null,
          },
        ]}
      />
      {summary.total > 0 ? (
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 type-label">{w.experienceTitle}</h3>
            <BarTable
              caption={w.experienceTitle}
              rows={WORKSHOP_EXPERIENCES.map((experience) => ({
                key: experience,
                label: experiences[experience].title,
                value: summary.byExperience[experience],
              }))}
            />
          </div>
          <div>
            <h3 className="mb-2 type-label">{w.perDayTitle}</h3>
            <DayColumns
              days={summary.perDay}
              caption={w.perDayTitle}
              label={(day, count) => format(w.dayCount, { day, count })}
              columns={[w.dayColumn, w.countColumn]}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The workshops with their numbers, the people who applied or were added, and the forms
 * to change all of it. Applications are read here and nowhere else: row level security
 * shows them to admins only, and this page runs as the signed-in admin.
 */
export function WorkshopsAdmin({
  workshops,
  applications,
}: {
  workshops: readonly Workshop[];
  applications: readonly WorkshopApplication[];
}) {
  return (
    <div className="flex flex-col gap-6">
      {workshops.length === 0 ? <p className="text-ink-2">{w.empty}</p> : null}
      {workshops.map((workshop) => {
        const mine = applications.filter((application) => application.workshopId === workshop.id);
        return (
          <article
            key={workshop.id}
            id={`atolye-${workshop.id}`}
            className={cn(cardClass, "flex scroll-mt-4 flex-col gap-6")}
          >
            <div className="flex flex-col gap-2">
              <h2 className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="type-card-title">{workshop.title}</span>
                <Chip>{workshop.isOpen ? w.open : w.closed}</Chip>
              </h2>
              <p className="type-meta">
                {workshopWhen(workshop).full}
                {workshop.locationText ? ` · ${workshop.locationText}` : null} ·{" "}
                {workshop.priceText}
              </p>
              <Capacity workshop={workshop} />
              <p className="flex flex-wrap gap-x-6 gap-y-2">
                {/* Not fetched ahead: saving here changes that very page. */}
                <Link href={`/workshop/${workshop.id}` as Route} prefetch={false} className={link}>
                  {t.admin.open}
                </Link>
                {mine.length > 0 ? (
                  // Files, not pages: plain links the browser downloads.
                  <>
                    <a href={`/osman/atolyeler/${workshop.id}/xlsx`} download className={link}>
                      {w.downloadXlsx}
                    </a>
                    <a href={`/osman/atolyeler/${workshop.id}/pdf`} download className={link}>
                      {w.downloadPdf}
                    </a>
                  </>
                ) : null}
              </p>
            </div>
            <WorkshopStats workshop={workshop} applications={mine} />
            <details>
              <summary className="cursor-pointer font-medium text-accent-ink">{w.edit}</summary>
              <WorkshopForm workshop={workshop} />
            </details>
            <details>
              <summary className="cursor-pointer font-medium text-accent-ink">{w.addTitle}</summary>
              <AddApplicantForm workshopId={workshop.id} />
            </details>
            <div>
              <h3 className="mb-2 type-label">
                {w.applicationsTitle}{" "}
                <span className="type-figure font-normal text-ink-2">{mine.length}</span>
              </h3>
              <RsvpSummary applications={mine} />
              {mine.length === 0 ? (
                <p className="text-ink-2">{w.applicationsEmpty}</p>
              ) : (
                <ul aria-label={w.applicationsTitle} className="border-t border-line">
                  {mine.map((application) => (
                    <Application
                      key={application.id}
                      application={application}
                      workshop={workshop}
                    />
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
