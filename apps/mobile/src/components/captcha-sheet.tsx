import { useCallback, useRef, useState } from "react";
import { Modal, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { env } from "@/lib/env";
import { t } from "@/lib/i18n";
import { useColors } from "@/lib/theme";

import { Button } from "./ui";

/** What the site's /uygulama/dogrulama page posts (AppCaptchaMessage there). */
type Message = { type: "token"; token: string } | { type: "expired" } | { type: "disabled" };

/** The answer: a token, null when CAPTCHA is off, or "cancelled". */
type Answer = string | null | "cancelled";

/**
 * Supabase wants a Turnstile token with every sign-in request. The app cannot draw the
 * widget itself, so it opens the website's small CAPTCHA page in a WebView and takes the
 * token from there. `ask()` resolves once the check is passed (or turned off, or closed).
 */
export function useCaptcha(): { ask: () => Promise<Answer>; sheet: React.ReactNode } {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const resolver = useRef<((answer: Answer) => void) | null>(null);

  const finish = useCallback((answer: Answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setOpen(false);
  }, []);

  const ask = useCallback(
    () =>
      new Promise<Answer>((resolve) => {
        resolver.current = resolve;
        setOpen(true);
      }),
    [],
  );

  function onMessage(event: WebViewMessageEvent) {
    let message: Message;
    try {
      message = JSON.parse(event.nativeEvent.data) as Message;
    } catch {
      return;
    }
    if (message.type === "token") finish(message.token);
    else if (message.type === "disabled") finish(null);
    // "expired": the widget asks again by itself.
  }

  const sheet = (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => finish("cancelled")}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <WebView
          source={{ uri: `${env.siteUrl}/uygulama/dogrulama` }}
          onMessage={onMessage}
          style={{ flex: 1, backgroundColor: colors.background }}
        />
        <View style={{ padding: 18 }}>
          <Button
            title={t.mobile.closeCaptcha}
            variant="outline"
            onPress={() => finish("cancelled")}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );

  return { ask, sheet };
}
