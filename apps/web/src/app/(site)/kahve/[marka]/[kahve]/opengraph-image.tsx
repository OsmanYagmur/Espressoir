import { SCORE_MAX } from "@espressoir/core";
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

/** The score as on the page: the number, "/10" and one bar in the accent, score × 10 %. */
function Score({ score }: { score: number | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: 240 }}>
      <div style={{ display: "flex", alignItems: "baseline", fontFamily: OG_FONTS.sans }}>
        <div
          style={{
            fontSize: 120,
            fontWeight: 600,
            color: score === null ? OG_COLORS["ink-3"] : OG_COLORS.ink,
          }}
        >
          {score === null ? "—" : scoreText(score)}
        </div>
        <div
          style={{ fontSize: 40, color: OG_COLORS["ink-2"], marginLeft: 6 }}
        >{`/${SCORE_MAX}`}</div>
      </div>
      <div
        style={{
          display: "flex",
          height: 12,
          marginTop: 12,
          borderRadius: 6,
          background: OG_COLORS.sunk,
        }}
      >
        {score === null ? null : (
          <div
            style={{
              width: `${(score / SCORE_MAX) * 100}%`,
              borderRadius: 6,
              background: OG_COLORS.accent,
            }}
          />
        )}
      </div>
    </div>
  );
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
      <OgFrame label={t.og.label}>
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
  const nameSize = coffee.name.length <= 14 ? 104 : coffee.name.length <= 26 ? 84 : 64;

  return new ImageResponse(
    <OgFrame
      label={
        coffee.stats.tastingCount > 0
          ? format(t.coffee.tastingCount, { count: coffee.stats.tastingCount })
          : t.coffee.wishlist
      }
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
          <div style={{ fontSize: 34, color: OG_COLORS["ink-2"], marginBottom: 14 }}>
            {coffee.brand.name}
          </div>
          <OgTitle text={coffee.name} fontSize={nameSize} />
          {facts.length > 0 ? (
            <div style={{ fontSize: 30, marginTop: 26, color: OG_COLORS["ink-2"] }}>
              {facts.join(" · ")}
            </div>
          ) : null}
        </div>
        <Score score={avgScore} />
      </div>
    </OgFrame>,
    { ...OG_SIZE, fonts },
  );
}
