/**
 * How sign-in is offered on this deployment. Public values that only shape the form: the
 * switches that actually decide (signup on/off, Google, CAPTCHA) live in the Supabase
 * project's Auth settings. Setup: docs/setup-auth.md
 */
export const authConfig = {
  /** Supabase accepts new accounts: an unknown e-mail gets a code too. */
  signupEnabled: process.env.NEXT_PUBLIC_SIGNUP_ENABLED === "true",
  /** The Google provider is configured in Supabase. */
  googleEnabled: process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true",
  /** Cloudflare Turnstile site key; set it exactly when CAPTCHA is on in Supabase. */
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
} as const;

/** Where the auth server sends the browser back to (e-mail links, Google). */
export const AUTH_CALLBACK_PATH = "/auth/callback";
