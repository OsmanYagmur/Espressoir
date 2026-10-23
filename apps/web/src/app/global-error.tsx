"use client";

import { designTokens } from "@/lib/design-tokens";
import { t } from "@/lib/i18n";

const colors = designTokens.light;

// Replaces the root layout when it fails, so it must render <html>/<body> and cannot rely
// on the stylesheet, the theme or the fonts: the token values are written inline.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          padding: "48px 16px",
          background: colors.bg,
          color: colors.ink,
          fontFamily: "Georgia, serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 40, lineHeight: "44px", fontWeight: 600 }}>
          {t.states.errorTitle}
        </h1>
        <p
          style={{
            maxWidth: 640,
            fontFamily: "system-ui, sans-serif",
            fontSize: 18,
            lineHeight: "28px",
            color: colors["ink-2"],
          }}
        >
          {t.states.errorBody}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            height: 48,
            marginTop: 16,
            padding: "0 24px",
            border: "none",
            borderRadius: 12,
            background: colors.accent,
            color: colors["on-accent"],
            fontFamily: "system-ui, sans-serif",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t.states.retry}
        </button>
      </body>
    </html>
  );
}
