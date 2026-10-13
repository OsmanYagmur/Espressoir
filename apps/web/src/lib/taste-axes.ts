import { TASTE_DIMENSIONS, TASTE_MAX, tasteMeans, type TasteProfile } from "@espressoir/core";

import type { RadarAxis } from "@/components/stats/radar";
import { formatDecimal } from "@/lib/format";
import { format, t } from "@/lib/i18n";

const label = t.panel.form.taste;

/** One tasting's profile as radar corners: "4/5" where its author gave a value. */
export function profileAxes(profile: TasteProfile): RadarAxis[] {
  return TASTE_DIMENSIONS.map((dimension) => {
    const value = profile[dimension];
    return {
      label: label[dimension],
      value,
      display: value === null ? t.taste.missing : format(t.taste.ofMax, { value, max: TASTE_MAX }),
    };
  });
}

/** The average profile of several tastings as radar corners, each with its own n. */
export function meanAxes(profiles: readonly TasteProfile[]): RadarAxis[] {
  return tasteMeans(profiles).map(({ dimension, n, mean, small }) => ({
    label: label[dimension],
    value: mean,
    display: mean === null ? t.taste.missing : formatDecimal(mean),
    n,
    small,
  }));
}
