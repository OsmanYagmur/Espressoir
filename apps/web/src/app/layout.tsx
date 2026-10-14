import { siteConfig } from "@espressoir/core";
import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeProvider } from "@/components/site/theme-provider";
import { t } from "@/lib/i18n";
import { DEFAULT_LOOK, LOOK_SCRIPT } from "@/lib/look-config";
import { getSiteUrl } from "@/lib/site-url";

import "./globals.css";

// Variable width axis: expanded for display headings, normal for running text.
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
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
    { media: "(prefers-color-scheme: light)", color: "#f4f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#141211" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      data-look={DEFAULT_LOOK}
      suppressHydrationWarning
      className={`${archivo.variable} ${plexMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        {/* Runs before the first paint, so a visitor who chose the other look never sees
            this one flash by. Pages are static: the choice lives in the browser. */}
        <script dangerouslySetInnerHTML={{ __html: LOOK_SCRIPT }} />
        <ThemeProvider>
          <a
            href="#icerik"
            className="sr-only z-50 bg-primary px-4 py-2 font-mono text-xs text-primary-foreground uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
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
