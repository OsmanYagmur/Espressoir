import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { t } from "@/lib/i18n";
import { useNotifications } from "@/lib/notifications";
import { fonts, useColors } from "@/lib/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );

export default function TabsLayout() {
  const colors = useColors();
  const { unread, refreshUnread } = useNotifications();
  return (
    <Tabs
      // A tab coming into view (also on the way back from a page) counts the unread again.
      screenListeners={{ focus: () => void refreshUnread() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.foreground },
        tabBarLabelStyle: { fontFamily: fonts.mono, fontSize: 10 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t.mobile.tabs.feed, tabBarIcon: icon("newspaper-outline") }}
      />
      <Tabs.Screen
        name="kahveler"
        options={{ title: t.mobile.tabs.coffees, tabBarIcon: icon("cafe-outline") }}
      />
      <Tabs.Screen
        name="kafeler"
        options={{ title: t.mobile.tabs.cafes, tabBarIcon: icon("storefront-outline") }}
      />
      <Tabs.Screen
        name="ekle"
        options={{ title: t.mobile.add.tab, tabBarIcon: icon("add-circle-outline") }}
      />
      <Tabs.Screen
        name="hesap"
        options={{
          title: t.mobile.tabs.account,
          tabBarIcon: icon("person-outline"),
          // The unread notifications, as the website's bell shows them.
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.brand, color: colors.brandForeground },
        }}
      />
    </Tabs>
  );
}
