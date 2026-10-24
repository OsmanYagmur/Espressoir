import type { Recipe } from "@espressoir/core";

import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const r = t.info.recipe;

/**
 * RecipeCard: a guide's recipe above its steps, every value with its unit as the guide
 * writes it. Measures are set in the figure style; words ("orta", "soğuk su") are not.
 */
export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const rows = [
    { label: r.dose, value: recipe.dose },
    { label: r.water, value: recipe.water },
    ...(recipe.temperature ? [{ label: r.temperature, value: recipe.temperature }] : []),
    { label: r.time, value: recipe.time },
    { label: r.grind, value: recipe.grind },
  ];
  return (
    <Card className="mb-8">
      <h2 className="mb-4 type-label">{r.title}</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 xs:grid-cols-3">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="type-meta">{label}</dt>
            <dd className={cn(/^\d/.test(value) ? "font-mono tabular-nums" : "font-medium")}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
