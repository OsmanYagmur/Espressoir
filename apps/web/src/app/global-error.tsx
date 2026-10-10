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
          display: "grid",
          placeItems: "center",
          background: "#f8f3e9",
          color: "#251a15",
          fontFamily: "Georgia, serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 500 }}>{t.states.errorTitle}</h1>
          <p style={{ color: "#6e594b" }}>{t.states.errorBody}</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.2rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#2e201a",
              color: "#f8f3e9",
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            {t.states.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
