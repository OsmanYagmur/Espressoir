"use client";

import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  type ReportReason,
  type ReportTarget,
} from "@espressoir/core";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { t } from "@/lib/i18n";
import { useHasSession } from "@/lib/session-cookie";
import { cn } from "@/lib/utils";

const s = t.social;

// Quiet: a word, underlined on hover; reporting is rare and must not compete with reading.
const quietButton = "cursor-pointer text-sm text-ink-2 underline underline-offset-3 hover:text-ink";

/**
 * "Report this" for a tasting, a comment, a member or a coffee: a link that opens a short
 * form in place. Offered to signed-in members only; an admin sees the report in the panel.
 */
export function ReportButton({
  target,
  targetId,
  className,
}: {
  target: ReportTarget;
  targetId: string;
  className?: string;
}) {
  const signedIn = useHasSession();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<{ tone: "done" | "error"; text: string } | null>(null);

  if (!signedIn) return null;

  async function submit(form: FormData) {
    const reason = REPORT_REASONS.find((candidate) => candidate === form.get("reason"));
    if (!reason) return;
    const details = String(form.get("details") ?? "");
    setPending(true);
    setOutcome(null);
    try {
      const { fileReport, getViewerId } = await import("./social-data");
      const viewer = await getViewerId();
      if (!viewer) throw new Error("no session");
      await fileReport(viewer, target, targetId, reason satisfies ReportReason, details);
      setOutcome({ tone: "done", text: s.reportSent });
      setOpen(false);
    } catch (failure) {
      const kind = (failure as { kind?: string }).kind;
      if (kind === "duplicate") {
        setOutcome({ tone: "done", text: s.reportDuplicate });
        setOpen(false);
      } else {
        setOutcome({
          tone: "error",
          text:
            kind === "rateLimited"
              ? s.errors.rateLimited
              : kind === "restricted"
                ? s.errors.restricted
                : s.errors.failed,
        });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      {outcome?.tone === "done" ? (
        <p role="status" className="text-sm text-ink-2">
          {outcome.text}
        </p>
      ) : (
        <button
          type="button"
          className={cn(quietButton, "justify-self-start")}
          aria-expanded={open}
          aria-controls={formId}
          onClick={() => setOpen((current) => !current)}
        >
          {s.report}
        </button>
      )}
      {open ? (
        <form
          id={formId}
          className="grid max-w-md gap-4 rounded-md border border-line bg-surface p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(new FormData(event.currentTarget));
          }}
        >
          <fieldset className="grid gap-2">
            <legend className="mb-2 type-label">{s.reportTitle}</legend>
            {REPORT_REASONS.map((reason) => (
              <label key={reason} className="flex items-start gap-3">
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  required
                  className="mt-1 size-4 accent-accent"
                />
                {s.reportReasons[reason]}
              </label>
            ))}
          </fieldset>
          <label className="grid gap-2">
            <span className="type-label">{s.reportDetails}</span>
            <Textarea name="details" maxLength={REPORT_DETAILS_MAX_LENGTH} className="min-h-20" />
          </label>
          {outcome?.tone === "error" ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {outcome.text}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? s.sending : s.reportSend}
            </Button>
            <button type="button" className={quietButton} onClick={() => setOpen(false)}>
              {s.cancel}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
