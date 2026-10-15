import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** "Resmi hesap": a verified business account. Words, not a colour or an icon alone. */
export function OfficialBadge({
  label = t.business.badge,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "label-caps inline-block border border-foreground px-1.5 py-0.5 align-middle font-mono text-xs whitespace-nowrap text-foreground",
        className,
      )}
    >
      ✓ {label}
    </span>
  );
}
