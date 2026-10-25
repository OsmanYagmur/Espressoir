import {
  ArrowDownToLineIcon,
  CoffeeIcon,
  CupSodaIcon,
  CylinderIcon,
  FlameIcon,
  FlaskRoundIcon,
  FunnelIcon,
  GaugeIcon,
  HourglassIcon,
  PlugIcon,
  SnowflakeIcon,
  WavesIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * The icons a brewing guide can be listed with (its `icon:` header), each a Lucide icon
 * that looks like the method: the cone of a V60, the AeroPress's tube, the moka pot's
 * flame, the French press's plunger, the espresso machine's pressure gauge, the Turkish
 * coffee cup, cold brew's snowflake, the drip machine's plug, the Chemex's hourglass
 * shape, the Kalita's wavy filter, a glass with a straw for iced coffee, the siphon's
 * round flask.
 */
export const ARTICLE_ICONS = {
  funnel: FunnelIcon,
  cylinder: CylinderIcon,
  flame: FlameIcon,
  plunger: ArrowDownToLineIcon,
  gauge: GaugeIcon,
  cup: CoffeeIcon,
  snowflake: SnowflakeIcon,
  plug: PlugIcon,
  hourglass: HourglassIcon,
  waves: WavesIcon,
  iced: CupSodaIcon,
  flask: FlaskRoundIcon,
} as const satisfies Record<string, LucideIcon>;

export type ArticleIconId = keyof typeof ARTICLE_ICONS;

export const isArticleIconId = (id: string): id is ArticleIconId =>
  Object.hasOwn(ARTICLE_ICONS, id);
