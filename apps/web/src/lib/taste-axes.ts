import { TASTE_DIMENSIONS, tasteMeans, type TasteProfile } from "@espressoir/core";

import type { TasteRow } from "@/components/coffee/taste-profile";

/** One tasting's profile as TasteProfile rows. */
export function profileRows(profile: TasteProfile): TasteRow[] {
  return TASTE_DIMENSIONS.map((dimension) => ({ dimension, value: profile[dimension] }));
}

/** The average profile of several tastings, each dimension with its own n. */
export function meanRows(profiles: readonly TasteProfile[]): TasteRow[] {
  return tasteMeans(profiles).map(({ dimension, n, mean, small }) => ({
    dimension,
    value: mean,
    n,
    small,
  }));
}
