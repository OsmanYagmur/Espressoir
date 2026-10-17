import type { Archive } from "@espressoir/db";
import { RefreshControl, ScrollView } from "react-native";

import { useArchive } from "@/lib/archive";
import { useColors } from "@/lib/theme";
import { useScreenTitle } from "@/navigation";

import { StateView } from "./ui";

/**
 * A page of one thing from the archive (a coffee, a café, a member): the archive's loading
 * and failed states, pull-to-refresh, and "not found" when the thing is not in it.
 */
export function DetailScreen({
  title,
  render,
  notFound,
}: {
  title: string;
  render: (archive: Archive) => React.ReactNode | null;
  notFound: string;
}) {
  const colors = useColors();
  useScreenTitle(title);
  const { state, refresh } = useArchive();
  const archive = state.archive;
  const body = archive ? render(archive) : null;

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={state.status !== "loading" && state.refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.foreground}
          />
        }
      >
        {state.status === "loading" ? (
          <StateView state="loading" />
        ) : !archive ? (
          <StateView state="failed" onRetry={() => void refresh()} />
        ) : (
          (body ?? <StateView state="empty" message={notFound} />)
        )}
      </ScrollView>
    </>
  );
}
