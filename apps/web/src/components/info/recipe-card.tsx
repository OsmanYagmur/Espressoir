import type { Recipe } from "@espressoir/core";

import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const r = t.info.recipe;

/**
 * RecipeCard: a guide's recipe above its steps, every value with its unit as the guide
 * writes it, large enough to read from the counter. Measures are set in tabular figures;
 * words ("orta", "soğuk su") are not. `ratio` comes from the guide's brewing plan (its
 * dose and water, which the build checks against the recipe), never typed by hand.
 */
export function RecipeCard({ recipe, ratio }: { recipe: Recipe; ratio?: string }) {
  const rows = [
    { label: r.dose, value: recipe.dose },
    { label: r.water, value: recipe.water },
    ...(ratio ? [{ label: r.ratio, value: ratio }] : []),
    ...(recipe.temperature ? [{ label: r.temperature, value: recipe.temperature }] : []),
    { label: r.time, value: recipe.time },
    { label: r.grind, value: recipe.grind },
  ];
  return (
    <Card className="mb-8">
      <h2 className="mb-4 type-label">{r.title}</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 xs:grid-cols-3">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1 border-l-2 border-sage pl-3">
            <dt className="type-meta">{label}</dt>
            <dd
              className={cn(
                "text-xl",
                /^\d/.test(value) ? "font-semibold tabular-nums" : "font-medium",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
