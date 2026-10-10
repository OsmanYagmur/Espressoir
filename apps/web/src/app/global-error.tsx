"use client";

import { t } from "@/lib/i18n";

// Replaces the root layout when it fails, so it must render <html>/<body> and
// cannot rely on the theme or fonts.
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
          padding: "2.5rem 1.25rem",
          background: "#f4f4f1",
          color: "#161616",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <h1
          style={{
            margin: 0,
            paddingBottom: "1rem",
            borderBottom: "2px solid #161616",
            fontSize: "2.5rem",
            fontWeight: 800,
            textTransform: "uppercase",
          }}
        >
          {t.states.errorTitle}
          <span style={{ color: "#cc291f" }}>.</span>
        </h1>
        <p style={{ color: "#64645e", maxWidth: "52ch" }}>{t.states.errorBody}</p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "1rem",
            padding: "0.7rem 1.2rem",
            border: "none",
            background: "#161616",
            color: "#f4f4f1",
            fontFamily: "monospace",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {t.states.retry}
        </button>
      </body>
    </html>
  );
}
