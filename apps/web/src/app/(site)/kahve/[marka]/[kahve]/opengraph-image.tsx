import { ImageResponse } from "next/og";

import { getArchive } from "@/lib/data/archive";
import { findCoffee } from "@/lib/data/selectors";
import { countryName } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { loadOgFonts, OG_COLORS, OG_FONTS, OG_SIZE, OgFrame, OgTitle } from "@/lib/og";

export const alt = t.coffeeDetail.ogAlt;
export const size = OG_SIZE;
export const contentType = "image/png";

/** Whole scores as they are, averages with a decimal comma (same as the on-page badge). */
function scoreText(score: number): string {
  return Number.isInteger(score) ? String(score) : score.toFixed(1).replace(".", ",");
}

// The same stamp logic as the site's score badge: red for 9–10, solid ink for 8, an
// outline below that. The number is always there, so colour is never the only signal.
function scoreBox(score: number | null) {
  const base = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 190,
    height: 190,
    fontFamily: OG_FONTS.display,
    fontSize: 112,
  } as const;
  if (score === null) {
    return { ...base, border: `5px dashed ${OG_COLORS.muted}`, color: OG_COLORS.muted };
  }
  const rounded = Math.round(score);
  if (rounded >= 9) return { ...base, background: OG_COLORS.brand, color: OG_COLORS.white };
  if (rounded >= 8) return { ...base, background: OG_COLORS.ink, color: OG_COLORS.paper };
  return { ...base, border: `5px solid ${OG_COLORS.ink}` };
}

// One card per coffee, drawn at build time like the pages themselves.
export async function generateStaticParams() {
  const { coffees } = await getArchive();
  return coffees.map((coffee) => ({ marka: coffee.brand.slug, kahve: coffee.slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ marka: string; kahve: string }>;
}) {
  const { marka, kahve } = await params;
  const archive = await getArchive();
  const coffee = findCoffee(archive, marka, kahve);
  const fonts = loadOgFonts();

  if (!coffee) {
    return new ImageResponse(
      <OgFrame label={t.states.notFoundCode}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <OgTitle text={t.states.notFoundTitle} fontSize={84} />
        </div>
      </OgFrame>,
      { ...OG_SIZE, fonts },
    );
  }

  const methods = new Map(archive.brewMethods.map((method) => [method.slug, method.name]));
  const facts = [
    coffee.form ? t.coffee.forms[coffee.form] : null,
    coffee.originCountry ? countryName(coffee.originCountry) : null,
    ...coffee.stats.brewMethodSlugs.slice(0, 2).map((slug) => methods.get(slug) ?? null),
  ].filter((fact): fact is string => fact !== null);
  const { avgScore } = coffee.stats;
  // Long names get smaller type so they stay within three lines.
  const nameSize = coffee.name.length <= 14 ? 124 : coffee.name.length <= 26 ? 96 : 74;

  return new ImageResponse(
    <OgFrame
      label={(coffee.stats.tastingCount > 0
        ? format(t.coffee.tastingCount, { count: coffee.stats.tastingCount })
        : t.coffee.wishlist
      ).toLocaleUpperCase("tr")}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingBottom: 34,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 48 }}>
          <div style={{ fontSize: 34, color: OG_COLORS.muted, marginBottom: 14 }}>
            {coffee.brand.name}
          </div>
          <OgTitle text={coffee.name} fontSize={nameSize} />
          {facts.length > 0 ? (
            <div style={{ fontSize: 28, marginTop: 26 }}>{facts.join(" · ")}</div>
          ) : null}
        </div>
        <div style={scoreBox(avgScore)}>{avgScore === null ? "–" : scoreText(avgScore)}</div>
      </div>
    </OgFrame>,
    { ...OG_SIZE, fonts },
  );
}
