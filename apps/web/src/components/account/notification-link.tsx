"use client";

import { BellIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { format, t } from "@/lib/i18n";
import { useHasSession } from "@/lib/session-cookie";

/** Sent by the notifications page once it has marked what it shows as read. */
export const NOTIFICATIONS_READ_EVENT = "espressoir:notifications-read";

function CurrentNotificationLink() {
  // The header outlives page changes; reading the path counts again after each one.
  const pathname = usePathname();
  const signedIn = useHasSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { countUnreadNotifications } = await import("@/components/social/notification-data");
        const unread = await countUnreadNotifications();
        if (!cancelled) setCount(unread);
      } catch {
        // The number is a convenience: without it the link still leads to the list.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    void load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(NOTIFICATIONS_READ_EVENT, load);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(NOTIFICATIONS_READ_EVENT, load);
    };
  }, [signedIn, pathname]);

  if (!signedIn) return null;
  const unread = count > 0;

  return (
    <Link
      href="/bildirimler"
      prefetch={false}
      aria-label={unread ? format(t.notifications.linkUnread, { count }) : t.notifications.link}
      className="relative grid size-9 place-items-center focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <BellIcon className="size-[18px]" aria-hidden />
      {unread ? (
        <span
          aria-hidden
          className="absolute -top-0.5 -right-1 min-w-4 bg-brand px-1 text-center font-mono text-[0.625rem] leading-4 font-medium text-brand-foreground"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

/**
 * The way to the notifications, in the header of every page, with the number not seen yet.
 * Members only: it decides in the browser (from the session cookie) whether to show at
 * all, and loads the Supabase client only then. The number is counted again on every page
 * change and when the tab comes back into view; there is no open connection.
 */
export function NotificationLink() {
  return (
    <Suspense fallback={null}>
      <CurrentNotificationLink />
    </Suspense>
  );
}
