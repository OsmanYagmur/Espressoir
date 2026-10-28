import { FlavorTags } from "@/components/coffee/flavor-tags";
import { ScoreBadge } from "@/components/coffee/score-badge";
import { TasteProfile } from "@/components/coffee/taste-profile";
import { Chip } from "@/components/ui/chip";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Tags from the fixed list (flavor_tags); an Ethiopian washed coffee leans floral (icerik.md). */
const SAMPLE_TAGS = [
  { slug: "ciceksi", name: "Çiçeksi" },
  { slug: "yasemin", name: "Yasemin" },
  { slug: "narenciye", name: "Narenciye" },
] as const;

/**
 * The hero's preview of a tasting, beside the photo: drawn with the same parts as a real
 * one (score, method, flavour notes, taste profile, note) and labelled as a sample, so it
 * shows what the form records without passing for anybody's entry. A plain card, framed
 * by a line like every other: nothing floats over the photo. Not a link: there is nothing
 * behind it.
 */
export function SampleTasting({ className }: { className?: string }) {
  return (
    <figure
      className={cn("flex flex-col gap-4 rounded-lg border border-line bg-surface p-5", className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col items-start gap-2">
          <Chip>{t.home.sample.label}</Chip>
          <p className="type-card-title">{t.home.sample.coffee}</p>
          <p className="type-meta">{t.home.sample.meta}</p>
        </div>
        <ScoreBadge score={8} />
      </div>
      <FlavorTags tags={SAMPLE_TAGS} />
      <TasteProfile
        rows={[
          { dimension: "body", value: 2 },
          { dimension: "acidity", value: 4 },
          { dimension: "sweetness", value: 3 },
        ]}
      />
      <p className="border-t border-line pt-3">{t.home.sample.note}</p>
      <figcaption className="type-meta">{t.home.sample.caption}</figcaption>
    </figure>
  );
}
