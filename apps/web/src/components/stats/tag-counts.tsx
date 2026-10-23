import type { TagCount } from "@espressoir/core";

import { format, t } from "@/lib/i18n";

/**
 * How often each flavour note was ticked, as bars from zero inside a table: the name, the
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
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {tags.map((tag) => (
          <tr key={tag.slug} className="border-b border-line">
            <th scope="row" className="w-[40%] py-2 pr-3 text-left text-base font-medium">
              {(names.get(tag.slug) ?? tag.slug).toLocaleLowerCase("tr")}
            </th>
            <td className="py-2">
              <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-sunk">
                <span
                  className="block h-full rounded-full bg-ink-2"
                  style={{ width: `${(tag.count / most) * 100}%` }}
                />
              </span>
            </td>
            <td className="w-24 py-2 pl-3 text-right type-figure">
              {format(t.taste.community.tagCount, { count: tag.count })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
