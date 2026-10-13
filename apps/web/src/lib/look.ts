"use client";

import { useSyncExternalStore } from "react";

import { DEFAULT_LOOK, LOOK_STORAGE_KEY, LOOKS, type Look } from "./look-config";

const CHANGED = "espressoir:look";

function current(): Look {
  const value = document.documentElement.dataset.look;
  return LOOKS.find((look) => look === value) ?? DEFAULT_LOOK;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGED, onChange);
  // Another tab of the same browser changed it.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The look in effect. On the server and during hydration it is the default one. */
export function useLook(): Look {
  return useSyncExternalStore(subscribe, current, () => DEFAULT_LOOK);
}

/** Switches the look at once and remembers it for this browser. */
export function setLook(look: Look) {
  document.documentElement.dataset.look = look;
  try {
    localStorage.setItem(LOOK_STORAGE_KEY, look);
  } catch {
    // Private mode or storage disabled: the choice lasts until the page is reloaded.
  }
  window.dispatchEvent(new Event(CHANGED));
}
