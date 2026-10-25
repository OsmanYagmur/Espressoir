"use client";

import { Share2Icon } from "lucide-react";
import { useState } from "react";

import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * "Paylaş": the phone's own share sheet (WhatsApp, Instagram, Messages…) where the browser
 * has one, otherwise the address copied to the clipboard, saying so. `path` shares another
 * address than the page's own (a quiz result); the page's address is the default.
 */
export function ShareButton({
  title,
  text,
  path,
  className,
}: {
  title: string;
  text?: string;
  path?: string;
  className?: string;
}) {
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    const url = path ? new URL(path, window.location.origin).href : window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // Closing the sheet is a choice, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setNote(t.share.copied);
    } catch {
      setNote(t.share.failed);
    }
  }

  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex cursor-pointer items-center gap-2 rounded-sm font-semibold text-accent-ink underline underline-offset-3"
      >
        <Share2Icon aria-hidden className="size-5 stroke-[1.5]" />
        {t.share.button}
      </button>
      <span role="status" className="type-meta">
        {note}
      </span>
    </span>
  );
}
