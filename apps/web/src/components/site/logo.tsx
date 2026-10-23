import { siteConfig } from "@espressoir/core";

/** There is no logo file: the name, in the display face, as written. */
export function Wordmark() {
  return (
    <span lang="en" className="font-display text-2xl font-semibold text-ink">
      {siteConfig.name}
    </span>
  );
}
