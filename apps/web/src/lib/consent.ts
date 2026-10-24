"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's answer to the one cookie question (Google Analytics), kept in this browser
 * only. Nothing from Google loads before a "yes"; "no" is as easy as "yes", and the footer
 * asks again whenever the visitor wants (KVKK: explicit, withdrawable consent).
 */
export type Consent = "granted" | "denied";

/** The property's measurement ID ("G-…"); without it nothing is asked or loaded. */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || null;

const KEY = "espressoir-consent";
const EVENT = "espressoir:consent";

function read(): Consent | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    // Storage blocked (private mode, settings): ask on every visit, load nothing.
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The answer so far: undefined until the browser has been asked (the server cannot know). */
export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

/** Google Analytics' cookies (_ga, _ga_<id>), on the host and on its parent domain. */
export function forgetAnalytics() {
  const host = location.hostname;
  const names = document.cookie
    .split(";")
    .map((pair) => pair.split("=")[0]?.trim() ?? "")
    .filter((name) => name === "_ga" || name.startsWith("_ga_"));
  for (const name of names) {
    for (const domain of ["", `; domain=${host}`, `; domain=.${host.replace(/^www\./, "")}`]) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
    }
  }
}

export function setConsent(value: Consent | null) {
  try {
    if (value) localStorage.setItem(KEY, value);
    else localStorage.removeItem(KEY);
  } catch {
    // Not kept; the question comes back on the next visit.
  }
  if (value === "denied" && GA_MEASUREMENT_ID) {
    // Google's own switch: a tag already running on this page stops writing and sending.
    Object.assign(window, { [`ga-disable-${GA_MEASUREMENT_ID}`]: true });
    forgetAnalytics();
    // Loaded earlier on this page: only a reload takes it out.
    if ("gtag" in window) location.reload();
  }
  window.dispatchEvent(new Event(EVENT));
}
