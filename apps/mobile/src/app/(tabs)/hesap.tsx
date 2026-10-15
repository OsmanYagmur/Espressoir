import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Button, Heading, Mono } from "@/components/ui";
import { env } from "@/lib/env";
import { format, t } from "@/lib/i18n";
import { useNotifications } from "@/lib/notifications";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";

const m = t.mobile.account;

/** Signed out: the way in. Signed in: who, their notebook, and the way out. */
export default function AccountScreen() {
  const colors = useColors();
  const { session, member } = useSession();
  const { unread } = useNotifications();

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <Heading>{t.mobile.tabs.account}</Heading>
        {session === undefined ? null : session === null ? (
          <>
            <Body muted>{m.signInNote}</Body>
            <Button title={t.auth.submit} onPress={() => router.push("/giris")} />
          </>
        ) : (
          <>
            {member ? <Mono>{format(m.signedInAs, { username: member.username })}</Mono> : null}
            {member && !member.onboarded ? <Body muted>{m.onboarding}</Body> : null}
            {member?.onboarded ? (
              <Button
                title={m.myProfile}
                variant="outline"
                onPress={() =>
                  router.push({ pathname: "/u/[username]", params: { username: member.username } })
                }
              />
            ) : null}
            <Button
              title={
                unread > 0 ? format(m.notificationsUnread, { count: unread }) : m.notifications
              }
              variant={unread > 0 ? "solid" : "outline"}
              onPress={() => router.push("/bildirimler")}
            />
            <Button
              title={m.suggestions}
              variant="outline"
              onPress={() => router.push("/oneriler")}
            />
            <Body muted>{m.siteNote}</Body>
            <Button
              title={m.openSite}
              variant="outline"
              onPress={() => void WebBrowser.openBrowserAsync(env.siteUrl)}
            />
            <Button title={t.auth.signOut} onPress={() => void supabase.auth.signOut()} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
