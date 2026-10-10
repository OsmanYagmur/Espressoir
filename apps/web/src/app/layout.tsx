import { siteConfig } from "@espressoir/core";
import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeProvider } from "@/components/site/theme-provider";
import { t } from "@/lib/i18n";
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
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#141211" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${archivo.variable} ${plexMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
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
