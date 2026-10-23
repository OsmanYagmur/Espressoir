"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { t } from "@/lib/i18n";

const OPTIONS = [
  { value: "light", label: t.theme.light, Icon: SunIcon },
  { value: "dark", label: t.theme.dark, Icon: MoonIcon },
  { value: "system", label: t.theme.system, Icon: MonitorIcon },
] as const;

const noop = () => () => {};

/** Light, dark or the system's colours: three buttons, the chosen one pressed. */
export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  // The choice lives in this browser: unknown while the static page is rendered and hydrated.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const current = mounted ? (theme ?? "system") : null;

  return (
    <div role="group" aria-label={t.theme.label} className="flex gap-1" data-testid="theme-switch">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={current === value}
          onClick={() => setTheme(value)}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-transparent px-3 text-sm text-ink-2 transition-colors hover:bg-sunk hover:text-ink aria-pressed:border-line-strong aria-pressed:text-ink"
        >
          <Icon aria-hidden className="size-5 stroke-[1.5]" />
          {label}
        </button>
      ))}
    </div>
  );
}
