import "server-only";

import type { WorkshopApplicationInput, Workshop } from "@espressoir/db";

import { format, t } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";
import { workshopWhen } from "@/lib/workshop-format";

const m = t.workshop.mail;

/** The domain is verified with Resend (it already sends the sign-in mails). */
const FROM = "Espressoir <atolye@espressoir.com>";

/**
 * Where the owner hears about applications: `RESEND_API_KEY` (the app's second secret,
 * read only in this file) and `WORKSHOP_NOTIFY_EMAIL`. Without either nothing is sent and
 * the applications are still in the admin panel, which says what is missing.
 */
export function mailSetup(): { key: string; to: string } | null {
  const key = process.env.RESEND_API_KEY?.trim();
  const to = process.env.WORKSHOP_NOTIFY_EMAIL?.trim();
  return key && to ? { key, to } : null;
}

/** Sends one plain-text mail through Resend's API (an HTTPS request, no package). */
async function send(
  subject: string,
  lines: readonly string[],
): Promise<"sent" | "missing" | "failed"> {
  const setup = mailSetup();
  if (!setup) return "missing";
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${setup.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [setup.to], subject, text: lines.join("\n") }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return "sent";
    console.error(`[workshop] mail refused: ${response.status} ${await response.text()}`);
  } catch (error) {
    console.error("[workshop] mail failed:", error instanceof Error ? error.message : error);
  }
  return "failed";
}

const panelLink = (workshopId?: string) =>
  new URL(`/osman/atolyeler${workshopId ? `#atolye-${workshopId}` : ""}`, getSiteUrl()).href;

/**
 * Tells the owner about a new application: who, how to reach them, how they get on with
 * coffee, their question, the seats left, and a link straight to the workshop in the
 * admin panel, where one click approves or holds it. A failure is logged, never shown to
 * the applicant: their application is saved either way.
 */
export async function notifyNewApplication(
  input: WorkshopApplicationInput,
  workshop: Workshop,
  waitlist: boolean,
): Promise<void> {
  const subject = format(waitlist ? m.waitlistSubject : m.subject, {
    title: workshop.title,
    name: input.name,
  });
  await send(subject, [
    format(m.intro, { title: workshop.title, date: workshopWhen(workshop).date }),
    "",
    `${m.name}: ${input.name}`,
    `${m.contact}: ${input.contact}`,
    `${m.experience}: ${t.workshop.form.experiences[input.experience].title}`,
    ...(input.question ? [`${m.question}: ${input.question}`] : []),
    `${m.seatsLeft}: ${Math.max(workshop.seatsLeft - (waitlist ? 0 : 1), 0)} / ${workshop.capacity}`,
    "",
    `${m.panel}: ${panelLink(workshop.id)}`,
  ]);
}

/** A test from the admin panel: proves the key, the domain and the address work together. */
export function sendTestMail(): Promise<"sent" | "missing" | "failed"> {
  return send(m.testSubject, [m.testBody, "", `${m.panel}: ${panelLink()}`]);
}
