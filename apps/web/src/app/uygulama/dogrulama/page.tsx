import type { Metadata } from "next";

import { AppCaptcha } from "@/components/account/app-captcha";
import { authConfig } from "@/lib/auth-config";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t.mobile.captchaTitle,
  robots: { index: false, follow: false },
};

/** Opened by the mobile app in a WebView to get a CAPTCHA token for signing in. */
export default function AppCaptchaPage() {
  return <AppCaptcha siteKey={authConfig.turnstileSiteKey} />;
}
