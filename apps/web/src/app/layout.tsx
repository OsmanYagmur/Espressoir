import { siteConfig } from "@espressoir/core";
import type { Metadata, Viewport } from "next";
import { Archivo, Fraunces, IBM_Plex_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeProvider } from "@/components/site/theme-provider";
import { designTokens } from "@/lib/design-tokens";
import { t } from "@/lib/i18n";
import { getSiteUrl } from "@/lib/site-url";

import "./globals.css";

// Each family fills the token of the same name (design/tokens.css). latin-ext carries the
// Turkish letters (ğ, ş, ı, İ).
const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-display",
  display: "swap",
});

const sans = Archivo({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

const defaultTitle = `${siteConfig.name} · ${siteConfig.tagline.tr}`;

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: defaultTitle, template: `%s · ${siteConfig.name}` },
  description: t.meta.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: siteConfig.name,
    title: defaultTitle,
    description: t.meta.description,
  },
  twitter: { card: "summary_large_image" },
  // Added to an iPhone's home screen, the site opens full screen under its own name.
  appleWebApp: { capable: true, title: siteConfig.name, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // The page may reach under the rounded corners and the home bar; what must stay clear
  // of them (the form's save bar) keeps the safe-area insets as padding.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: designTokens.light.bg },
    { media: "(prefers-color-scheme: dark)", color: designTokens.dark.bg },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <ThemeProvider>
          <a
            href="#icerik"
            className="sr-only z-50 rounded-md bg-surface px-4 py-2 type-label focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
          >
            {t.a11y.skipToContent}
          </a>
          <SiteHeader />
          <main id="icerik" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
