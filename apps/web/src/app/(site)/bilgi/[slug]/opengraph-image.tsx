import { ImageResponse } from "next/og";

import { getArticles } from "@/lib/data/articles";
import { t } from "@/lib/i18n";
import { loadOgFonts, OG_COLORS, OG_FONTS, OG_SIZE, OgFrame, OgTitle } from "@/lib/og";

export const alt = t.info.ogAlt;
export const size = OG_SIZE;
export const contentType = "image/png";

// One card per article, drawn at build time like the pages themselves.
export async function generateStaticParams() {
  return (await getArticles()).map((article) => ({ slug: article.slug }));
}

/**
 * An article's share card: its question in the display face and the first sentence of
 * its answer; a guide shows its recipe's numbers instead, in the figure face.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = (await getArticles()).find((candidate) => candidate.slug === slug);
  const fonts = loadOgFonts();

  if (!article) {
    return new ImageResponse(
      <OgFrame label={t.info.title}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <OgTitle text={t.states.notFoundTitle} fontSize={84} />
        </div>
      </OgFrame>,
      { ...OG_SIZE, fonts },
    );
  }

  const { recipe } = article;
  const figures = recipe
    ? [recipe.dose, recipe.water, recipe.temperature, recipe.time].filter(
        (value): value is string => value !== null && /^\d/.test(value),
      )
    : [];
  // Long questions get smaller type so they stay within three lines.
  const titleSize = article.title.length <= 28 ? 88 : article.title.length <= 44 ? 72 : 60;

  return new ImageResponse(
    <OgFrame label={recipe ? t.info.topics.demleme : t.info.title}>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "flex-end",
          paddingBottom: 36,
        }}
      >
        <OgTitle text={article.title} fontSize={titleSize} />
        {figures.length > 0 ? (
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontFamily: OG_FONTS.sans,
              fontWeight: 600,
              fontSize: 34,
              color: OG_COLORS["ink-2"],
            }}
          >
            {figures.join("  ·  ")}
          </div>
        ) : (
          <div style={{ fontSize: 30, marginTop: 24, maxWidth: 980, color: OG_COLORS["ink-2"] }}>
            {article.summary.split(". ")[0]?.replace(/\.?$/, ".")}
          </div>
        )}
      </div>
    </OgFrame>,
    { ...OG_SIZE, fonts },
  );
}
