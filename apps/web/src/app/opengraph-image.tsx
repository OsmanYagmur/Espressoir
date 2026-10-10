import { ImageResponse } from "next/og";

import { t } from "@/lib/i18n";
import { loadOgFonts, OG_SIZE, OgFrame, OgTitle } from "@/lib/og";

export const alt = t.meta.description;
export const size = OG_SIZE;
export const contentType = "image/png";

/** The default share image, used by every page that does not draw its own. */
export default function Image() {
  return new ImageResponse(
    <OgFrame
      label={t.home.methodsLine.split(" · ").slice(0, 3).join(" · ").toLocaleUpperCase("tr")}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "flex-end",
          paddingBottom: 30,
        }}
      >
        <OgTitle text={t.home.title.toLocaleUpperCase("tr")} fontSize={150} />
        <div style={{ fontSize: 28, marginTop: 24, maxWidth: 900 }}>{t.home.intro}</div>
      </div>
    </OgFrame>,
    { ...OG_SIZE, fonts: loadOgFonts() },
  );
}
