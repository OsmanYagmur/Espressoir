"use client";

import { useEffect, useImperativeHandle, useRef } from "react";

import { t } from "@/lib/i18n";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      theme?: "auto" | "light" | "dark";
      size?: "normal" | "flexible" | "compact";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    },
  ): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let script: Promise<TurnstileApi> | undefined;

/** Loads Cloudflare's script once per page, only when a form that needs it is shown. */
function loadTurnstile(): Promise<TurnstileApi> {
  script ??= new Promise((resolve, reject) => {
    const element = document.createElement("script");
    element.src = SCRIPT_SRC;
    element.async = true;
    element.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile unavailable"));
    element.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.append(element);
  });
  return script;
}

export interface TurnstileHandle {
  /** A token works once: ask for a fresh one after every request that used it. */
  reset(): void;
}

/**
 * Cloudflare Turnstile, the check Supabase Auth asks for before it sends a sign-in e-mail.
 * It reports a token when the visitor has passed, and null when that token is spent,
 * expired or could not be issued.
 */
export function Turnstile({
  siteKey,
  onToken,
  ref,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  ref?: React.Ref<TurnstileHandle>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<{ api: TurnstileApi; id: string } | null>(null);
  // The latest callback, without re-creating the widget when the parent re-renders.
  const report = useRef(onToken);
  useEffect(() => {
    report.current = onToken;
  }, [onToken]);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current) return;
        const id = api.render(container.current, {
          sitekey: siteKey,
          language: "tr",
          theme: "auto",
          size: "flexible",
          callback: (token) => report.current(token),
          "expired-callback": () => report.current(null),
          "error-callback": () => report.current(null),
        });
        widget.current = { api, id };
      })
      .catch(() => report.current(null));

    return () => {
      cancelled = true;
      widget.current?.api.remove(widget.current.id);
      widget.current = null;
      report.current(null);
    };
  }, [siteKey]);

  useImperativeHandle(ref, () => ({
    reset() {
      report.current(null);
      widget.current?.api.reset(widget.current.id);
    },
  }));

  return <div ref={container} aria-label={t.auth.captchaLabel} className="min-h-[65px]" />;
}
