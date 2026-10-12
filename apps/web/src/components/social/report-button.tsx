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

const quietButton =
  "font-mono text-xs underline underline-offset-4 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

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
        <p role="status" className="font-mono text-xs">
          {outcome.text}
        </p>
      ) : (
        <button
          type="button"
          className={cn(quietButton, "justify-self-start text-muted-foreground")}
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
          className="grid max-w-md gap-3 border border-input p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(new FormData(event.currentTarget));
          }}
        >
          <fieldset className="grid gap-1.5">
            <legend className="label-caps mb-1.5 text-muted-foreground">{s.reportTitle}</legend>
            {REPORT_REASONS.map((reason) => (
              <label key={reason} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  required
                  className="mt-1 accent-foreground"
                />
                {s.reportReasons[reason]}
              </label>
            ))}
          </fieldset>
          <label className="grid gap-1.5">
            <span className="label-caps text-muted-foreground">{s.reportDetails}</span>
            <Textarea name="details" maxLength={REPORT_DETAILS_MAX_LENGTH} className="min-h-20" />
          </label>
          {outcome?.tone === "error" ? (
            <p role="alert" className="font-mono text-xs text-destructive">
              {outcome.text}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              type="submit"
              variant="outline"
              disabled={pending}
              className="h-10 px-5 font-mono text-xs uppercase"
            >
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
