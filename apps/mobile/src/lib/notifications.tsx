import { countUnreadNotifications } from "@espressoir/db";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";

import { useSession } from "./session";
import { supabase } from "./supabase";

interface NotificationsValue {
  /** Notifications the member has not seen; 0 when signed out. */
  unread: number;
  refreshUnread: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsValue>({
  unread: 0,
  refreshUnread: async () => undefined,
});

/**
 * The unread count behind the account tab's badge. No open connection, like the website:
 * it is counted again whenever a tab comes into view (the tabs layout asks) and when the
 * app comes back to the foreground. Notifications themselves are made by the database's
 * triggers.
 */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const signedIn = Boolean(session);
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!signedIn) {
      setUnread(0);
      return;
    }
    try {
      setUnread(await countUnreadNotifications(supabase));
    } catch {
      // Offline: keep the last count.
    }
  }, [signedIn]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshUnread();
    });
    return () => subscription.remove();
  }, [refreshUnread]);

  return <NotificationsContext value={{ unread, refreshUnread }}>{children}</NotificationsContext>;
}

export function useNotifications(): NotificationsValue {
  return useContext(NotificationsContext);
}
