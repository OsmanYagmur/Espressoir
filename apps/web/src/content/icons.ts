import {
  ArrowDownToLineIcon,
  CoffeeIcon,
  CylinderIcon,
  FlameIcon,
  FunnelIcon,
  GaugeIcon,
  SnowflakeIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * The icons a brewing guide can be listed with (its `icon:` header), each a Lucide icon
 * that looks like the method: the cone of a V60, the AeroPress's tube, the moka pot's
 * flame, the French press's plunger, the espresso machine's pressure gauge, the Turkish
 * coffee cup, cold brew's snowflake.
 */
export const ARTICLE_ICONS = {
  funnel: FunnelIcon,
  cylinder: CylinderIcon,
  flame: FlameIcon,
  plunger: ArrowDownToLineIcon,
  gauge: GaugeIcon,
  cup: CoffeeIcon,
  snowflake: SnowflakeIcon,
} as const satisfies Record<string, LucideIcon>;

export type ArticleIconId = keyof typeof ARTICLE_ICONS;

export const isArticleIconId = (id: string): id is ArticleIconId =>
  Object.hasOwn(ARTICLE_ICONS, id);
