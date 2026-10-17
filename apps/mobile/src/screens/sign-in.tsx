import { router } from "@/navigation";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

import { useCaptcha } from "@/components/captcha-sheet";
import { Body, Button, Field, Heading, Mono } from "@/components/ui";
import { format, t } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useColors } from "@/lib/theme";

const a = t.auth;

/** What Supabase Auth's refusal means to a person (the website's login form says the same). */
function messageFor(error: { code?: string; status?: number; message: string }): string {
  if (
    error.status === 429 ||
    error.code === "over_request_rate_limit" ||
    error.code === "over_email_send_rate_limit"
  ) {
    return a.rateLimited;
  }
  if (error.code === "captcha_failed" || /captcha/i.test(error.message)) return a.captchaFailed;
  if (error.code === "otp_expired" || error.code === "invalid_otp") return a.codeInvalid;
  if (error.code === "invalid_credentials") return a.invalid;
  return a.failed;
}

/**
 * Signing in, as on the website: an e-mail code (no new accounts: signup is by
 * invitation), or a password for accounts that have one. Every request first passes the
 * CAPTCHA sheet.
 */
export default function SignInScreen() {
  const colors = useColors();
  const captcha = useCaptcha();
  const [mode, setMode] = useState<"code" | "password">("code");
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  async function run(
    task: (
      captchaToken: string | undefined,
    ) => Promise<{ error: { code?: string; status?: number; message: string } | null }>,
    onDone: () => void,
  ) {
    setNotice(null);
    const token = await captcha.ask();
    if (token === "cancelled") return;
    setBusy(true);
    try {
      const { error } = await task(token ?? undefined);
      if (error) setNotice({ tone: "error", text: messageFor(error) });
      else onDone();
    } catch {
      setNotice({ tone: "error", text: a.failed });
    } finally {
      setBusy(false);
    }
  }

  const address = email.trim().toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 18, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        <Heading>{a.title}</Heading>
        <Body muted>{t.mobile.signInLead}</Body>
        <Field
          label={a.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={step === "email"}
        />

        {mode === "code" && step === "email" ? (
          <Button
            title={busy ? a.sendingCode : a.sendCode}
            disabled={busy || !validEmail}
            onPress={() =>
              void run(
                (captchaToken) =>
                  supabase.auth.signInWithOtp({
                    email: address,
                    options: { shouldCreateUser: false, captchaToken },
                  }),
                () => {
                  setStep("code");
                  setNotice({ tone: "info", text: format(a.codeSent, { email: address }) });
                },
              )
            }
          />
        ) : null}

        {mode === "code" && step === "code" ? (
          <View style={{ gap: 14 }}>
            <Field
              label={a.code}
              hint={a.codeHint}
              value={code}
              onChangeText={(value) => setCode(value.replace(/\D/g, ""))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={10}
            />
            <Button
              title={busy ? a.submitting : a.submit}
              disabled={busy || code.length < 6}
              onPress={async () => {
                setBusy(true);
                setNotice(null);
                const { error } = await supabase.auth.verifyOtp({
                  email: address,
                  token: code,
                  type: "email",
                });
                setBusy(false);
                if (error) setNotice({ tone: "error", text: messageFor(error) });
                else router.back();
              }}
            />
            <Button
              title={a.changeEmail}
              variant="outline"
              onPress={() => {
                setStep("email");
                setCode("");
                setNotice(null);
              }}
            />
          </View>
        ) : null}

        {mode === "password" ? (
          <View style={{ gap: 14 }}>
            <Field
              label={a.password}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
            />
            <Button
              title={busy ? a.submitting : a.submit}
              disabled={busy || !validEmail || password.length === 0}
              onPress={() =>
                void run(
                  (captchaToken) =>
                    supabase.auth.signInWithPassword({
                      email: address,
                      password,
                      options: { captchaToken },
                    }),
                  () => router.back(),
                )
              }
            />
          </View>
        ) : null}

        {notice ? (
          <Mono style={{ color: notice.tone === "error" ? colors.destructive : colors.foreground }}>
            {notice.text}
          </Mono>
        ) : null}

        <Button
          title={mode === "code" ? a.usePassword : a.useCode}
          variant="outline"
          onPress={() => {
            setMode(mode === "code" ? "password" : "code");
            setStep("email");
            setNotice(null);
          }}
        />
        <Mono muted>{a.inviteOnly}</Mono>
      </ScrollView>
      {captcha.sheet}
    </KeyboardAvoidingView>
  );
}
