import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { t } from "@/lib/i18n";
import { fonts, useColors } from "@/lib/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
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
        options={{ title: t.mobile.tabs.coffees, tabBarIcon: icon("cafe-outline") }}
      />
      <Tabs.Screen
        name="kafeler"
        options={{ title: t.mobile.tabs.cafes, tabBarIcon: icon("storefront-outline") }}
      />
      <Tabs.Screen
        name="oneriler"
        options={{ title: t.mobile.tabs.suggestions, tabBarIcon: icon("sparkles-outline") }}
      />
      <Tabs.Screen
        name="hesap"
        options={{ title: t.mobile.tabs.account, tabBarIcon: icon("person-outline") }}
      />
    </Tabs>
  );
}
