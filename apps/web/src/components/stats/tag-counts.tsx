import type { TagCount } from "@espressoir/core";

import { format, t } from "@/lib/i18n";

/**
 * How often each flavour tag was ticked, as bars from zero inside a table: the name, the
 * bar and the count are all printed, so the table is its own text version.
 */
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
  const most = Math.max(...tags.map((tag) => tag.count), 1);
  return (
    <table className="w-full border-collapse font-mono text-xs">
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {tags.map((tag) => (
          <tr key={tag.slug} className="border-b border-border">
            <th scope="row" className="w-[42%] py-2 pr-3 text-left font-sans text-sm font-semibold">
              {names.get(tag.slug) ?? tag.slug}
            </th>
            <td className="py-2">
              <span
                aria-hidden
                className="block h-2.5 bg-foreground"
                style={{ width: `${(tag.count / most) * 100}%` }}
              />
            </td>
            <td className="w-20 py-2 pl-3 text-right tabular-nums">
              {format(t.taste.community.tagCount, { count: tag.count })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
