import { BadgeCheckIcon } from "lucide-react";

import { Chip } from "@/components/ui/chip";
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
    <Chip className={cn("align-middle", className)}>
      <BadgeCheckIcon aria-hidden className="size-4 stroke-[1.5]" />
      {label}
    </Chip>
  );
}
