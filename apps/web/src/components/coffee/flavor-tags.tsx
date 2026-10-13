import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The flavour tags of one tasting, as small labels. One sentence rather than a list: a
 * tasting already is a list item, and read aloud this is "Tat etiketleri: Kakao, Fındık".
 * Renders nothing without tags.
 */
export function FlavorTags({
  tags,
  className,
}: {
  tags: readonly { slug: string; name: string }[];
  className?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <p className={cn("flex flex-wrap gap-1.5", className)}>
      <span className="sr-only">{t.taste.tagsLabel}: </span>
      {tags.map((tag, index) => (
        <span
          key={tag.slug}
          className="border border-border px-1.5 py-0.5 font-mono text-[0.6875rem] leading-tight"
        >
          {tag.name}
          {index < tags.length - 1 ? <span className="sr-only">, </span> : null}
        </span>
      ))}
    </p>
  );
}
