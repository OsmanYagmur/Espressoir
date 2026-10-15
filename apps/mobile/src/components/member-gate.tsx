import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { View } from "react-native";

import { env } from "@/lib/env";
import { t } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { useColors } from "@/lib/theme";

import { Body, Button, StateView } from "./ui";

/**
 * Writing needs a member who may post: signed in, with a username. The database says the
 * same (`can_post()`); this only spares a form that would be refused.
 */
export function MemberGate({ children }: { children: (userId: string) => React.ReactNode }) {
  const colors = useColors();
  const { session, member } = useSession();
  if (session === undefined) return <StateView state="loading" />;

  const blocked = !session ? (
    <>
      <Body muted>{t.mobile.add.signInFirst}</Body>
      <Button title={t.auth.submit} onPress={() => router.push("/giris")} />
    </>
  ) : member && !member.onboarded ? (
    <>
      <Body muted>{t.mobile.account.onboarding}</Body>
      <Button
        title={t.mobile.account.openSite}
        variant="outline"
        onPress={() => void WebBrowser.openBrowserAsync(`${env.siteUrl}/hesap/kurulum`)}
      />
    </>
  ) : null;

  if (blocked) {
    return (
      <View style={{ flex: 1, padding: 18, gap: 16, backgroundColor: colors.background }}>
        {blocked}
      </View>
    );
  }
  return children(session!.user.id);
}
