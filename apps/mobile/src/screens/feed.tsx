import {
  feedCursorOf,
  latestVisits,
  loadFeedPage,
  type CafeVisit,
  type FeedSource,
  type Tasting,
} from "@espressoir/db";
import { router } from "@/navigation";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TastingEntry, VisitEntry } from "@/components/entries";
import { Body, Button, Heading, Mono, StateView } from "@/components/ui";
import { useArchive } from "@/lib/archive";
import { t } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { fonts, useColors } from "@/lib/theme";

const f = t.feed;
/** Entries per page, as on the website's feed. */
const PAGE = 10;
/** How many café visits the "Kafeler" tab shows: one page, like the website's. */
const VISITS = 30;

type Tab = "everyone" | "following" | "cafes";

interface Pages {
  items: Tasting[];
  done: boolean;
  loading: boolean;
  failed: boolean;
}

const EMPTY: Pages = { items: [], done: false, loading: false, failed: false };

/** A feed read page by page from Supabase, keyset-paged like the website's later pages. */
function usePages(source: FeedSource, enabled: boolean) {
  const [pages, setPages] = useState<Pages>(EMPTY);

  const load = useCallback(
    async (from: "start" | "more") => {
      setPages((current) => ({ ...current, loading: true, failed: false }));
      try {
        const after = from === "start" ? null : feedCursorOf(pages.items.at(-1));
        const page = await loadFeedPage(supabase, source, after, PAGE);
        setPages((current) => ({
          items: from === "start" ? page : [...current.items, ...page],
          done: page.length < PAGE,
          loading: false,
          failed: false,
        }));
      } catch {
        setPages((current) => ({ ...current, loading: false, failed: true }));
      }
    },
    [source, pages.items],
  );

  useEffect(() => {
    if (enabled) void load("start");
    else setPages(EMPTY);
    // Only when the source or the session changes: `load` changes with every page.
  }, [source, enabled]);

  return { pages, load };
}

function TabButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 42,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: selected ? colors.foreground : colors.input,
        backgroundColor: selected ? colors.foreground : "transparent",
      }}
    >
      {/* "Takip ettiklerim" is long for a third of a phone: it shrinks rather than touch the edges. */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={{
          fontFamily: fonts.mono,
          fontSize: 12,
          paddingHorizontal: 6,
          color: selected ? colors.background : colors.foreground,
        }}
      >
        {label.toLocaleUpperCase("tr")}
      </Text>
    </Pressable>
  );
}

/**
 * The feed: the latest public tastings, those of the people the member follows, and the
 * latest café visits. An entry opens the tasting's page, where likes and comments are.
 */
export default function FeedScreen() {
  const colors = useColors();
  const { session } = useSession();
  const signedIn = Boolean(session);
  const { state: archiveState, refresh: refreshArchive } = useArchive();
  const [tab, setTab] = useState<Tab>("everyone");
  const everyone = usePages("tasting_feed", true);
  const following = usePages("following_feed", signedIn);
  const [refreshing, setRefreshing] = useState(false);

  const current = tab === "following" ? following : everyone;
  const visits: CafeVisit[] = archiveState.archive
    ? latestVisits(archiveState.archive, VISITS)
    : [];

  async function refresh() {
    setRefreshing(true);
    if (tab === "cafes") await refreshArchive();
    else await current.load("start");
    setRefreshing(false);
  }

  const header = (
    <View style={{ gap: 14, paddingBottom: 6 }}>
      <Heading>{f.title}</Heading>
      <Body muted>{f.intro}</Body>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t.mobile.feed.tabsLabel}
        style={{ flexDirection: "row", gap: 6 }}
      >
        <TabButton
          label={f.everyone}
          selected={tab === "everyone"}
          onPress={() => setTab("everyone")}
        />
        <TabButton
          label={f.following}
          selected={tab === "following"}
          onPress={() => setTab("following")}
        />
        <TabButton label={f.cafes} selected={tab === "cafes"} onPress={() => setTab("cafes")} />
      </View>
    </View>
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      tintColor={colors.foreground}
    />
  );

  if (tab === "cafes") {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
        <FlatList
          data={visits}
          keyExtractor={(visit) => visit.id}
          renderItem={({ item }) => <VisitEntry visit={item} showAuthor showCafe />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            archiveState.status === "loading" ? (
              <StateView state="loading" />
            ) : (
              <StateView state="empty" message={f.cafesEmpty} />
            )
          }
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
          refreshControl={refreshControl}
        />
      </SafeAreaView>
    );
  }

  const { pages } = current;
  let empty: React.ReactNode;
  if (tab === "following" && !signedIn) {
    empty = (
      <View style={{ gap: 14, paddingVertical: 24 }}>
        <Body muted>{f.signInFirst}</Body>
        <Button title={f.signIn} onPress={() => router.push({ screen: "SignIn" })} />
      </View>
    );
  } else if (pages.loading && pages.items.length === 0) {
    empty = <StateView state="loading" />;
  } else if (pages.failed) {
    empty = (
      <StateView state="failed" message={f.failed} onRetry={() => void current.load("start")} />
    );
  } else {
    empty = <StateView state="empty" message={tab === "following" ? f.followingEmpty : f.empty} />;
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={pages.items}
        keyExtractor={(tasting) => tasting.id}
        renderItem={({ item }) => <TastingEntry tasting={item} showAuthor showCoffee open />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          pages.items.length === 0 ? null : pages.loading ? (
            <ActivityIndicator style={{ paddingVertical: 20 }} />
          ) : pages.failed ? (
            <Mono style={{ color: colors.destructive, paddingVertical: 20 }}>{f.failed}</Mono>
          ) : pages.done ? (
            <Mono muted style={{ paddingVertical: 20 }}>
              {f.end}
            </Mono>
          ) : null
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (!pages.loading && !pages.done && !pages.failed && pages.items.length > 0) {
            void current.load("more");
          }
        }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
        refreshControl={refreshControl}
      />
    </SafeAreaView>
  );
}
