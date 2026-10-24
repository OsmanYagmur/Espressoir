"use client";

import Script from "next/script";
import { useEffect } from "react";

import { GA_MEASUREMENT_ID, forgetAnalytics, useConsent } from "@/lib/consent";

/**
 * Google Analytics, loaded only after the visitor said yes (lib/consent.ts). Page changes
 * inside the site are counted by GA's own history tracking (enhanced measurement).
 */
export function Analytics() {
  const consent = useConsent();
  // A "no" also clears what a tag wrote in its last moments before the page reloaded.
  useEffect(() => {
    if (consent === "denied") forgetAnalytics();
  }, [consent]);
  if (!GA_MEASUREMENT_ID || consent !== "granted") return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-config" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config",${JSON.stringify(GA_MEASUREMENT_ID)});`}
      </Script>
    </>
  );
}
