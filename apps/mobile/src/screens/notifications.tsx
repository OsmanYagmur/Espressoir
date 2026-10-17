import { loadNotifications, markNotificationsRead, type Notification } from "@espressoir/db";
import { router } from "@/navigation";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { Body, Button, Heading, Mono, StateView } from "@/components/ui";
import { formatMoment } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { useNotifications } from "@/lib/notifications";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { fonts, useColors } from "@/lib/theme";

const n = t.notifications;
/** As many as the website's page shows. */
const SHOWN = 100;

function Item({ item }: { item: Notification }) {
  const colors = useColors();
  const text = item.verification
    ? format(item.verification.approved ? n.verification.approved : n.verification.rejected, {
        business: item.verification.businessName,
      })
    : null;

  function open() {
    if (item.tasting) {
      router.push({ screen: "Tasting", params: { id: item.tasting.id } });
    } else if (!item.verification) {
      router.push({ screen: "Profile", params: { username: item.actor.username } });
    }
  }

  return (
    <Pressable
      accessibilityRole={item.verification ? "text" : "link"}
      onPress={open}
      style={({ pressed }) => ({
        paddingVertical: 14,
        paddingLeft: item.read ? 0 : 12,
        borderBottomWidth: 1,
        borderColor: colors.border,
        // Unread: a rule in the accent down the side, and the word "Yeni" (not colour alone).
        borderLeftWidth: item.read ? 0 : 2,
        borderLeftColor: colors.brand,
        backgroundColor: pressed ? colors.muted : "transparent",
        gap: 4,
      })}
    >
      <Text
        style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.foreground }}
      >
        {text ?? (
          <>
            <Text style={{ fontFamily: fonts.mono, fontSize: 13 }}>@{item.actor.username}</Text>{" "}
            {n.kinds[item.type]}
            {item.tasting ? (
              <Text style={{ fontFamily: fonts.bodyBold }}>
                {": "}
                {item.tasting.brandName} {item.tasting.coffeeName}
              </Text>
            ) : null}
          </>
        )}
        {item.read ? null : (
          <Text style={{ fontFamily: fonts.mono, fontSize: 11 }}>
            {"  "}
            {n.unread.toLocaleUpperCase("tr")}
          </Text>
        )}
      </Text>
      {item.excerpt ? <Body muted>“{item.excerpt}”</Body> : null}
      <Mono muted>{formatMoment(item.createdAt)}</Mono>
    </Pressable>
  );
}

/**
 * The member's notifications, newest first. What is shown is marked as read "up to" the
 * moment it was put on screen, so one arriving meanwhile stays new (as on the website).
 */
export default function NotificationsScreen() {
  const colors = useColors();
  const { session } = useSession();
  const signedIn = Boolean(session);
  const { refreshUnread } = useNotifications();
  const [items, setItems] = useState<Notification[] | "failed" | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!signedIn) return;
    const shownAt = new Date().toISOString();
    try {
      const loaded = await loadNotifications(supabase, SHOWN);
      setItems(loaded);
      if (loaded.some((item) => !item.read)) {
        await markNotificationsRead(supabase, shownAt);
        await refreshUnread();
      }
    } catch {
      setItems((current) => (Array.isArray(current) ? current : "failed"));
    }
  }, [signedIn, refreshUnread]);

  useEffect(() => {
    void load();
  }, [load]);

  const header = (
    <View style={{ gap: 12, paddingBottom: 6 }}>
      <Heading>{n.title}</Heading>
      <Body muted>{n.lead}</Body>
    </View>
  );

  if (session === undefined) return null;
  if (!signedIn) {
    return (
      <View style={{ flex: 1, padding: 18, gap: 16, backgroundColor: colors.background }}>
        <Body muted>{t.mobile.notifications.signInFirst}</Body>
        <Button title={t.auth.submit} onPress={() => router.push({ screen: "SignIn" })} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={{ backgroundColor: colors.background }}
        data={Array.isArray(items) ? items : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Item item={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          items === null ? (
            <StateView state="loading" />
          ) : items === "failed" ? (
            <StateView state="failed" message={t.mobile.loadFailed} onRetry={() => void load()} />
          ) : (
            <StateView state="empty" message={n.empty} />
          )
        }
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.foreground}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      />
    </>
  );
}
