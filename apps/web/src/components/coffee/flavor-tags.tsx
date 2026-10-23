import { Chip, Chips } from "@/components/ui/chip";
import { t } from "@/lib/i18n";

/** At most five chips in a row (DESIGN.md); a tasting carries no more than that anyway. */
const SHOWN = 5;

/**
 * The flavour notes of one tasting, as note chips in small letters ("bal"). One sentence
 * rather than a list: a tasting already is a list item, and read aloud this is "Tat
 * notaları: kakao, fındık". Renders nothing without notes.
 */
export function FlavorTags({
  tags,
  className,
}: {
  tags: readonly { slug: string; name: string }[];
  className?: string;
}) {
  if (tags.length === 0) return null;
  const shown = tags.slice(0, SHOWN);
  return (
    <Chips className={className}>
      <span className="sr-only">{t.taste.tagsLabel}: </span>
      {shown.map((tag, index) => (
        <Chip key={tag.slug} variant="note">
          {tag.name.toLocaleLowerCase("tr")}
          {index < shown.length - 1 ? <span className="sr-only">, </span> : null}
        </Chip>
      ))}
    </Chips>
  );
}
