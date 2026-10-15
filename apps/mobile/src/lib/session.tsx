import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

import { supabase } from "./supabase";

export interface Member {
  id: string;
  username: string;
  /** False until a username has been chosen (on the website). */
  onboarded: boolean;
}

interface SessionValue {
  /** Undefined while the stored session is being read. */
  session: Session | null | undefined;
  member: Member | null;
}

const SessionContext = createContext<SessionValue>({ session: undefined, member: null });

/** Who is signed in, kept current by Supabase's auth events. */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [member, setMember] = useState<Member | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) {
      setMember(null);
      return;
    }
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("id, username, onboarded_at")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setMember(
          data
            ? { id: data.id, username: data.username, onboarded: data.onboarded_at !== null }
            : null,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return <SessionContext value={{ session, member }}>{children}</SessionContext>;
}

export function useSession(): SessionValue {
  return useContext(SessionContext);
}
