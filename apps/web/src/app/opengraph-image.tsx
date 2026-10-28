import { ImageResponse } from "next/og";

import { t } from "@/lib/i18n";
import { loadOgFonts, OG_COLORS, OG_SIZE, OgFrame, OgTitle } from "@/lib/og";

export const alt = t.meta.description;
export const size = OG_SIZE;
export const contentType = "image/png";

/** The default share image, used by every page that does not draw its own. */
export default function Image() {
  return new ImageResponse(
    <OgFrame label={t.og.label}>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "flex-end",
          paddingBottom: 40,
        }}
      >
        <OgTitle text={`${t.home.heroTitle} ${t.home.heroTitleSecond}`} fontSize={76} />
        <div style={{ fontSize: 30, marginTop: 24, maxWidth: 940, color: OG_COLORS["ink-2"] }}>
          {t.home.heroLead}
        </div>
      </div>
    </OgFrame>,
    { ...OG_SIZE, fonts: loadOgFonts() },
  );
}
