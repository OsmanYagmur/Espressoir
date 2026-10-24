import "server-only";

import type { WorkshopApplicationInput, Workshop } from "@espressoir/db";

import { format, t } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";
import { workshopWhen } from "@/lib/workshop-format";

const m = t.workshop.mail;

/** The domain is verified with Resend (it already sends the sign-in mails). */
const FROM = "Espressoir <atolye@espressoir.com>";

/**
 * Tells the owner about a new application by e-mail, through Resend's API (a plain HTTPS
 * request, no package). `RESEND_API_KEY` is the app's second secret and is read only
 * here; `WORKSHOP_NOTIFY_EMAIL` is where the mail goes. Without either nothing is sent and
 * the applications are still in the admin panel. A failure is logged, never shown to the
 * applicant: their application is saved either way.
 */
export async function notifyNewApplication(
  input: WorkshopApplicationInput,
  workshop: Workshop,
  waitlist: boolean,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.WORKSHOP_NOTIFY_EMAIL;
  if (!key || !to) return;

  const subject = format(waitlist ? m.waitlistSubject : m.subject, { title: workshop.title });
  const lines = [
    format(m.intro, { title: workshop.title, date: workshopWhen(workshop).date }),
    "",
    `${m.name}: ${input.name}`,
    `${m.contact}: ${input.contact}`,
    `${m.experience}: ${t.workshop.form.experiences[input.experience].title}`,
    ...(input.question ? [`${m.question}: ${input.question}`] : []),
    `${m.seatsLeft}: ${Math.max(workshop.seatsLeft - (waitlist ? 0 : 1), 0)} / ${workshop.capacity}`,
    "",
    `${m.panel}: ${new URL("/osman/atolyeler", getSiteUrl()).href}`,
  ];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject, text: lines.join("\n") }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      console.error(
        `[workshop] notification mail refused: ${response.status} ${await response.text()}`,
      );
    }
  } catch (error) {
    console.error(
      "[workshop] notification mail failed:",
      error instanceof Error ? error.message : error,
    );
  }
}
