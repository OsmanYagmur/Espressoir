import type { TagCount } from "@espressoir/core";

import { format, t } from "@/lib/i18n";

import { BarTable } from "./bar-table";

/** How often each flavour note was ticked: its name (in small letters), a bar, the count. */
export function TagCounts({
  tags,
  names,
  caption,
}: {
  tags: readonly TagCount[];
  /** Tag slug → the name to print. */
  names: ReadonlyMap<string, string>;
  caption: string;
}) {
  return (
    <BarTable
      caption={caption}
      rows={tags.map((tag) => ({
        key: tag.slug,
        label: (names.get(tag.slug) ?? tag.slug).toLocaleLowerCase("tr"),
        value: tag.count,
        display: format(t.taste.community.tagCount, { count: tag.count }),
      }))}
    />
  );
}
