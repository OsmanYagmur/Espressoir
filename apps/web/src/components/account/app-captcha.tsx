"use client";

import { useEffect } from "react";

import { t } from "@/lib/i18n";

import { Turnstile } from "./turnstile";

declare global {
  interface Window {
    /** Present when the page is open inside the mobile app's WebView. */
    ReactNativeWebView?: { postMessage(message: string): void };
  }
}

export type AppCaptchaMessage =
  { type: "token"; token: string } | { type: "expired" } | { type: "disabled" };

function send(message: AppCaptchaMessage) {
  window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

/**
 * The CAPTCHA for the mobile app. Supabase asks for a Turnstile token on every sign-in
 * request; the app cannot render the widget itself, so it opens this page in a WebView and
 * takes the token from here. The page covers the site's chrome: inside the app only the
 * check shows. Without a site key (CAPTCHA off) it says so at once.
 */
export function AppCaptcha({ siteKey }: { siteKey: string | null }) {
  useEffect(() => {
    if (!siteKey) send({ type: "disabled" });
  }, [siteKey]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background p-6">
      <div className="grid w-full max-w-sm gap-4">
        <p className="font-mono text-sm">{t.mobile.captcha}</p>
        {siteKey ? (
          <Turnstile
            siteKey={siteKey}
            onToken={(token) => send(token ? { type: "token", token } : { type: "expired" })}
          />
        ) : null}
      </div>
    </div>
  );
}
