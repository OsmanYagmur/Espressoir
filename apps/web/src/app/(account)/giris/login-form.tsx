"use client";

import type { AuthError } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Turnstile, type TurnstileHandle } from "@/components/account/turnstile";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { AUTH_CALLBACK_PATH, authConfig } from "@/lib/auth-config";
import { format, t } from "@/lib/i18n";
import { getBrowserSupabase } from "@/lib/supabase/browser";

type Mode = "code" | "password";
type Step = "request" | "verify";

// "No such account" and "signup is closed" are answered exactly like success, so the form
// never tells a stranger which e-mail addresses have an account.
const QUIET_CODES = new Set(["otp_disabled", "signup_disabled", "user_not_found"]);

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function messageFor(error: AuthError, fallback: string): string {
  if (error.code === "captcha_failed") return t.auth.captchaFailed;
  if (error.status === 429 || error.code?.startsWith("over_")) return t.auth.rateLimited;
  return fallback;
}

const quietButton =
  "cursor-pointer text-accent-ink underline underline-offset-3 disabled:opacity-50";

/**
 * Sign-in runs in the browser, straight against Supabase Auth: the auth server then sees
 * each visitor's own address (its rate limits are per address), and no server function is
 * spent on logging in. The session lands in cookies, which the server reads from then on.
 */
export function LoginForm() {
  const [mode, setMode] = useState<Mode>("code");
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const router = useRouter();

  const siteKey = authConfig.turnstileSiteKey;
  const waitingForCaptcha = Boolean(siteKey) && !captchaToken;
  const blocked = pending || waitingForCaptcha;
  const captcha = captchaToken ? { captchaToken } : {};

  /** Runs one auth request; the CAPTCHA token it used is spent either way. */
  async function attempt(request: () => Promise<{ error: AuthError | null }>) {
    setPending(true);
    setError(null);
    try {
      return (await request()).error;
    } finally {
      turnstile.current?.reset();
      setPending(false);
    }
  }

  function finish() {
    // The session cookie is set by now; refresh drops anything rendered while signed out.
    router.replace("/panel");
    router.refresh();
  }

  async function requestCode() {
    const address = email.trim();
    if (!EMAIL_SHAPE.test(address)) return setError(t.auth.emailInvalid);

    const failure = await attempt(() =>
      getBrowserSupabase().auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: authConfig.signupEnabled,
          emailRedirectTo: new URL(AUTH_CALLBACK_PATH, window.location.origin).toString(),
          ...captcha,
        },
      }),
    ).catch(() => "failed" as const);

    if (failure === "failed") return setError(t.auth.failed);
    if (failure && !QUIET_CODES.has(failure.code ?? "")) {
      return setError(messageFor(failure, t.auth.failed));
    }
    setEmail(address);
    setInfo(format(t.auth.codeSent, { email: address }));
    setStep("verify");
  }

  async function verifyCode(code: string) {
    const failure = await attempt(() =>
      getBrowserSupabase().auth.verifyOtp({
        email,
        token: code.replace(/\s/g, ""),
        type: "email",
        options: captcha,
      }),
    ).catch(() => "failed" as const);

    if (failure === "failed") return setError(t.auth.failed);
    if (failure) return setError(messageFor(failure, t.auth.codeInvalid));
    finish();
  }

  async function signInWithPassword(password: string) {
    const address = email.trim();
    const failure = await attempt(() =>
      getBrowserSupabase().auth.signInWithPassword({
        email: address,
        password,
        options: captcha,
      }),
    ).catch(() => "failed" as const);

    if (failure === "failed") return setError(t.auth.failed);
    if (failure) {
      // One message for "no such account" and "wrong password": never reveal which.
      const wrong =
        failure.code === "invalid_credentials" || (!failure.code && failure.status === 400);
      return setError(wrong ? t.auth.invalid : messageFor(failure, t.auth.failed));
    }
    finish();
  }

  async function signInWithGoogle() {
    const failure = await attempt(() =>
      getBrowserSupabase().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: new URL(AUTH_CALLBACK_PATH, window.location.origin).toString(),
        },
      }),
    ).catch(() => "failed" as const);
    if (failure) setError(t.auth.failed);
  }

  function switchTo(next: Mode) {
    setMode(next);
    setStep("request");
    setError(null);
    setInfo(null);
  }

  function submit(form: FormData) {
    const text = (name: string) => {
      const value = form.get(name);
      return typeof value === "string" ? value : "";
    };
    if (mode === "password") {
      if (!EMAIL_SHAPE.test(email.trim()) || !text("password")) return setError(t.auth.invalid);
      return void signInWithPassword(text("password"));
    }
    if (step === "request") return void requestCode();
    if (!/^\d{6,10}$/.test(text("code").replace(/\s/g, ""))) return setError(t.auth.codeInvalid);
    void verifyCode(text("code"));
  }

  const enteringCode = mode === "code" && step === "verify";
  const submitLabel =
    mode === "code" && step === "request"
      ? pending
        ? t.auth.sendingCode
        : t.auth.sendCode
      : pending
        ? t.auth.submitting
        : t.auth.submit;

  return (
    <>
      <h2 className="mb-4 type-card-title">
        {mode === "code" ? t.auth.codeSection : t.auth.passwordSection}
      </h2>
      <div className="grid gap-6">
        {/* One form for every step: the children keep their places, so the CAPTCHA widget
            stays mounted (and its token valid) while the fields around it change. */}
        <form
          className="grid gap-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit(new FormData(event.currentTarget));
          }}
        >
          {enteringCode ? (
            <Field label={t.auth.code} htmlFor="code" hint={t.auth.codeHint}>
              <Input
                key="code"
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={12}
                autoFocus
                className="font-mono text-lg tracking-[0.3em]"
              />
            </Field>
          ) : (
            <Field label={t.auth.email} htmlFor="email">
              <Input
                key="email"
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
          )}
          {mode === "password" ? (
            <Field label={t.auth.password} htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
              />
            </Field>
          ) : null}
          {info && enteringCode ? (
            <p role="status" className="rounded-md bg-sunk p-4">
              {info} {t.auth.codeSentLink}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="font-medium text-danger">
              {error}
            </p>
          ) : null}
          {siteKey ? (
            <div>
              <Turnstile ref={turnstile} siteKey={siteKey} onToken={setCaptchaToken} />
              {waitingForCaptcha && !pending ? (
                <p className="mt-1 type-meta">{t.auth.captchaPending}</p>
              ) : null}
            </div>
          ) : null}
          <Button type="submit" block disabled={blocked}>
            {submitLabel}
          </Button>
          {enteringCode ? (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <button
                type="button"
                className={quietButton}
                disabled={blocked}
                onClick={() => void requestCode()}
              >
                {t.auth.resend}
              </button>
              <button type="button" className={quietButton} onClick={() => switchTo("code")}>
                {t.auth.changeEmail}
              </button>
            </div>
          ) : null}
        </form>

        <div className="grid gap-4 border-t border-line pt-6">
          {authConfig.googleEnabled ? (
            <Button
              type="button"
              variant="secondary"
              block
              disabled={pending}
              onClick={() => void signInWithGoogle()}
            >
              {t.auth.google}
            </Button>
          ) : null}
          <button
            type="button"
            className={`${quietButton} justify-self-start`}
            onClick={() => switchTo(mode === "code" ? "password" : "code")}
          >
            {mode === "code" ? t.auth.usePassword : t.auth.useCode}
          </button>
        </div>
      </div>
    </>
  );
}
