import type { ArticleBlock } from "@espressoir/core";

/**
 * The text of an article: paragraphs, and in a guide its subheadings and numbered steps
 * (numbered like the workshop's program). Everything is plain text, rendered escaped.
 */
export function ArticleBody({ blocks }: { blocks: readonly ArticleBlock[] }) {
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        const key = `${index}-${block.kind}`;
        if (block.kind === "heading") {
          return (
            <h2 key={key} className="mt-4 type-card-title">
              {block.text}
            </h2>
          );
        }
        if (block.kind === "steps") {
          return (
            <ol key={key} className="flex flex-col gap-3">
              {block.items.map((item, step) => (
                <li key={item} className="grid grid-cols-[32px_1fr] gap-x-3">
                  <span
                    aria-hidden
                    className="grid size-8 place-items-center rounded-full bg-sunk text-sm font-semibold tabular-nums"
                  >
                    {step + 1}
                  </span>
                  <p className="pt-1">{item}</p>
                </li>
              ))}
            </ol>
          );
        }
        return <p key={key}>{block.text}</p>;
      })}
    </div>
  );
}
