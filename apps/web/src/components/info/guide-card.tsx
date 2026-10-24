import { ArrowRightIcon, CoffeeIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { cardClass } from "@/components/ui/card";
import { ARTICLE_ICONS } from "@/content/icons";
import type { SiteGuide } from "@/lib/data/articles";
import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** A number and its unit on one line: "150 ml" never breaks into "150" and "ml". */
const together = (value: string) => value.replaceAll(" ", "\u00a0");

/** "15 g · 240 ml": what goes in, the first line of a guide's figures. */
export const recipeAmounts = ({ recipe }: SiteGuide) =>
  `${together(recipe.dose)} · ${together(recipe.water)}`;

/** "2,5–3 dk · orta öğütme": how long and how fine. */
export const recipeTiming = ({ recipe }: SiteGuide) =>
  `${recipe.time} · ${format(t.info.recipe.grindShort, { grind: recipe.grind })}`;

/**
 * GuideCard: a brewing method on the home page, as one link to its guide. Its icon, the
 * method's name and the recipe's numbers; on hover the card lifts, the icon tips over like
 * a kettle and the arrow moves on.
 */
export function GuideCard({ guide }: { guide: SiteGuide }) {
  const Icon = guide.iconId ? ARTICLE_ICONS[guide.iconId] : CoffeeIcon;
  return (
    <Link
      href={`/bilgi/${guide.slug}` as Route}
      className={cn(
        cardClass,
        "group flex h-full flex-col gap-2 text-ink no-underline transition-[border-color,translate] hover:-translate-y-0.5 hover:border-line-strong",
      )}
    >
      <span
        aria-hidden
        className="mb-2 grid size-11 place-items-center rounded-full bg-sunk transition-[rotate] group-hover:-rotate-12"
      >
        <Icon className="size-5 stroke-[1.5]" />
      </span>
      <span className="type-card-title">{guide.recipe.method}</span>
      <span className="type-figure text-ink-2">{recipeAmounts(guide)}</span>
      <span className="type-meta">{recipeTiming(guide)}</span>
      <ArrowRightIcon
        aria-hidden
        className="mt-auto size-5 stroke-[1.5] text-accent-ink transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}
