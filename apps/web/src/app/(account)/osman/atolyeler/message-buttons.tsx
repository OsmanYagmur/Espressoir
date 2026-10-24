"use client";

import { CopyIcon, MessageCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { noteMessageSent } from "./actions";

const small = buttonVariants({ variant: "secondary", size: "sm" });

/**
 * Opens WhatsApp with the message written out (the person's number, their personal link);
 * the admin presses send there. A plain link in a new tab, so it works without JavaScript;
 * with it, the panel also notes when the message went out.
 */
export function WhatsAppButton({
  href,
  label,
  description,
  applicationId,
  kind,
}: {
  href: string;
  label: string;
  /** Read after the label: who it is for, and that it opens WhatsApp. */
  description: string;
  applicationId: string;
  kind: "ask" | "remind";
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label}: ${description}`}
      className={small}
      onClick={() =>
        startTransition(async () => {
          await noteMessageSent(applicationId, kind);
          router.refresh();
        })
      }
    >
      <MessageCircleIcon aria-hidden />
      {label}
    </a>
  );
}

/** Copies the personal link, for sending it some other way (Instagram, a text message). */
export function CopyLinkButton({
  link,
  label,
  copiedLabel,
}: {
  link: string;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={cn(small)}
      onClick={() => {
        void navigator.clipboard.writeText(link).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      <CopyIcon aria-hidden />
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
