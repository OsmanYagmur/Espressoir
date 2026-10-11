"use client";

import { useSyncExternalStore } from "react";

// Supabase keeps the session in a cookie named "sb-<project>-auth-token" (split into
// ".0", ".1" when long). Its presence is a hint that someone is signed in; whoever acts on
// it still has to ask Supabase, which checks the session properly.
const hasSessionCookie = () => /(?:^|;\s*)sb-[^=;]*-auth-token/.test(document.cookie);

/** Browsers with the Cookie Store API say when a cookie changes; the rest wait for a render. */
function subscribe(onChange: () => void) {
  const store = (window as { cookieStore?: EventTarget }).cookieStore;
  store?.addEventListener("change", onChange);
  return () => store?.removeEventListener("change", onChange);
}

/**
 * Whether this browser appears to hold a session. Always false on the server and during
 * hydration, so static pages render the same for everyone and adjust afterwards. Costs
 * nothing: it does not load the Supabase client.
 */
export function useHasSession(): boolean {
  return useSyncExternalStore(subscribe, hasSessionCookie, () => false);
}
