import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The way into the quiz: a question, one sentence and a secondary button ("Teste başla"),
 * framed like a card. On the home page and above the articles.
 */
export function QuizBand({
  id,
  title,
  lead,
  action,
  className,
}: {
  id: string;
  title: string;
  lead: string;
  action: string;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-line bg-surface p-4 md:flex-row md:items-center md:justify-between md:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className="type-card-title">
          {title}
        </h2>
        <p className="text-ink-2">{lead}</p>
      </div>
      <Button asChild variant="secondary" className="group/quiz self-start md:self-center">
        <Link href="/kahve-testi">
          {action}
          <ArrowRightIcon
            aria-hidden
            className="transition-transform group-hover/quiz:translate-x-1"
          />
        </Link>
      </Button>
    </section>
  );
}
