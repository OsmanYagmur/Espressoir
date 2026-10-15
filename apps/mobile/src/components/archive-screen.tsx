import type { Archive } from "@espressoir/db";
import { FlatList, RefreshControl, type ListRenderItem } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useArchive } from "@/lib/archive";
import { useColors } from "@/lib/theme";

import { StateView } from "./ui";

/**
 * A screen built from the archive: a list with pull-to-refresh, and the loading and failed
 * states handled once. `header` sits above the rows and scrolls with them.
 */
export function ArchiveList<Item>({
  items,
  renderItem,
  keyOf,
  header,
  empty,
  edges = ["top"],
}: {
  items: (archive: Archive) => readonly Item[];
  renderItem: ListRenderItem<Item>;
  keyOf: (item: Item) => string;
  header?: (archive: Archive) => React.ReactElement;
  empty?: string;
  /** Screens under a header bar leave the top edge to it. */
  edges?: ("top" | "bottom")[];
}) {
  const colors = useColors();
  const { state, refresh } = useArchive();
  const archive = state.archive;

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={archive ? items(archive) : []}
        renderItem={renderItem}
        keyExtractor={keyOf}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
        ListHeaderComponent={archive && header ? header(archive) : null}
        ListEmptyComponent={
          state.status === "loading" ? (
            <StateView state="loading" />
          ) : !archive ? (
            <StateView state="failed" onRetry={() => void refresh()} />
          ) : (
            <StateView state="empty" message={empty} />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={state.status !== "loading" && state.refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.foreground}
          />
        }
      />
    </SafeAreaView>
  );
}
