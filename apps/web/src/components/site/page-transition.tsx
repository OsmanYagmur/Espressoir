"use client";

import { useSyncExternalStore, ViewTransition } from "react";

const subscribe = () => () => {};

/**
 * The page column's part in a page change: leaving, it fades out quickly while the new page
 * fades in (globals.css → page transitions). Only once the browser has taken the page
 * over: rendered on the server it carries no animation, because React would otherwise try
 * to play one while the first HTML is still arriving (the browser refuses that, and says
 * so in the console). A refresh or something loading inside the page never animates.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <ViewTransition exit={inBrowser ? "page-exit" : "none"} default="none">
      {children}
    </ViewTransition>
  );
}
