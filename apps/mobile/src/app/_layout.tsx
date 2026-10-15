import { Archivo_400Regular } from "@expo-google-fonts/archivo/400Regular";
import { Archivo_700Bold } from "@expo-google-fonts/archivo/700Bold";
import { Archivo_800ExtraBold } from "@expo-google-fonts/archivo/800ExtraBold";
import { IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono/500Medium";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ArchiveProvider } from "@/lib/archive";
import { t } from "@/lib/i18n";
import { NotificationsProvider } from "@/lib/notifications";
import { SessionProvider } from "@/lib/session";
import { fonts, useColors } from "@/lib/theme";

export default function RootLayout() {
  const colors = useColors();
  const [loaded] = useFonts({
    Archivo_400Regular,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    IBMPlexMono_500Medium,
  });
  // The fonts are in the bundle; this is a frame or two, not a network wait.
  if (!loaded) return null;

  return (
    <SessionProvider>
      <ArchiveProvider>
        <NotificationsProvider>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.foreground,
              headerTitleStyle: { fontFamily: fonts.mono, fontSize: 13 },
              headerShadowVisible: false,
              headerBackTitle: t.mobile.back,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="giris"
              options={{ presentation: "modal", title: t.mobile.signInTitle }}
            />
            <Stack.Screen
              name="tadim/yeni"
              options={{ presentation: "modal", title: t.mobile.add.newCoffeeTitle }}
            />
            <Stack.Screen
              name="ziyaret/yeni"
              options={{ presentation: "modal", title: t.mobile.add.newVisitTitle }}
            />
            <Stack.Screen name="oneriler" options={{ title: "" }} />
            <Stack.Screen name="bildirimler" options={{ title: t.notifications.title }} />
            <Stack.Screen name="tadim/[id]" options={{ title: t.tastingPage.kicker }} />
          </Stack>
        </NotificationsProvider>
      </ArchiveProvider>
    </SessionProvider>
  );
}
