"use client";

import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { t } from "@/lib/i18n";

/** A key press meant for a field the visitor is typing in. */
function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/**
 * The header's search button. "/" or ⌘K (Ctrl+K) anywhere opens the search page, or puts
 * the cursor back in its box when it is already open. It reads no URL: the header is in
 * every page's static shell.
 */
export function SearchLink() {
  const router = useRouter();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const shortcut =
        (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) ||
        (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey));
      if (!shortcut || typing(event.target)) return;
      event.preventDefault();
      const box = document.getElementById("arama");
      if (box) box.focus();
      else router.push("/ara");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <Link
      href="/ara"
      prefetch={false}
      aria-label={t.nav.search}
      title={t.nav.searchShortcut}
      aria-keyshortcuts="/ Meta+K Control+K"
      className="grid size-10 place-items-center rounded-md text-ink-2 no-underline transition-colors hover:bg-sunk hover:text-ink"
    >
      <SearchIcon aria-hidden className="size-5 stroke-[1.5]" />
    </Link>
  );
}
