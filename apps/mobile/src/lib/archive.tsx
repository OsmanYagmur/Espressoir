import { fetchArchiveRows, parseArchive, type Archive } from "@espressoir/db";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { supabase } from "./supabase";

type ArchiveState =
  | { status: "loading"; archive: null }
  | { status: "ready"; archive: Archive; refreshing: boolean }
  | { status: "failed"; archive: Archive | null; refreshing: boolean };

interface ArchiveContextValue {
  state: ArchiveState;
  refresh: () => Promise<void>;
}

const ArchiveContext = createContext<ArchiveContextValue | null>(null);

/**
 * The public archive, read once when the app opens and again on pull-to-refresh: the
 * same read and the same Zod read models as the website's pages (@espressoir/db).
 */
export function ArchiveProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ArchiveState>({ status: "loading", archive: null });

  const refresh = useCallback(async () => {
    setState((current) =>
      current.archive ? { ...current, refreshing: true } : { status: "loading", archive: null },
    );
    try {
      const archive = parseArchive(await fetchArchiveRows(supabase));
      setState({ status: "ready", archive, refreshing: false });
    } catch (error) {
      console.warn("[archive]", error instanceof Error ? error.message : error);
      setState((current) => ({ status: "failed", archive: current.archive, refreshing: false }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <ArchiveContext value={{ state, refresh }}>{children}</ArchiveContext>;
}

export function useArchive(): ArchiveContextValue {
  const value = useContext(ArchiveContext);
  if (!value) throw new Error("useArchive needs an ArchiveProvider.");
  return value;
}
