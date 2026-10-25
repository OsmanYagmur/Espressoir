import { ImageResponse } from "next/og";

import { t } from "@/lib/i18n";
import { loadOgFonts, OG_COLORS, OG_SIZE, OgFrame, OgTitle } from "@/lib/og";

export const alt = t.quiz.description;
export const size = OG_SIZE;
export const contentType = "image/png";

/** The quiz's share card: its question and what it takes. */
export default function Image() {
  return new ImageResponse(
    <OgFrame label={t.quiz.title}>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "flex-end",
          paddingBottom: 40,
        }}
      >
        <OgTitle text={t.quiz.heading} fontSize={96} />
        <div style={{ fontSize: 32, marginTop: 24, maxWidth: 900, color: OG_COLORS["ink-2"] }}>
          {t.quiz.lead}
        </div>
      </div>
    </OgFrame>,
    { ...OG_SIZE, fonts: loadOgFonts() },
  );
}
