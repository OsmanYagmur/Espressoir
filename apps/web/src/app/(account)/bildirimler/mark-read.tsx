"use client";

import { useEffect } from "react";

import { NOTIFICATIONS_READ_EVENT } from "@/components/account/notification-link";

import { markNotificationsRead } from "./actions";

/**
 * Tells the server that the list on screen has been seen, once the page is really open in
 * a browser (a link being fetched ahead never runs this), and then lets the number in the
 * header count again.
 */
export function MarkRead({ shownAt }: { shownAt: string }) {
  useEffect(() => {
    let cancelled = false;
    void markNotificationsRead(shownAt)
      .then(() => {
        if (!cancelled) window.dispatchEvent(new Event(NOTIFICATIONS_READ_EVENT));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [shownAt]);
  return null;
}
