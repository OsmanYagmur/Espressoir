"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";
import { setLook, useLook } from "@/lib/look";
import { LOOKS, type Look } from "@/lib/look-config";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const look = useLook();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={t.theme.toggle}
          data-testid="theme-toggle"
        >
          {/* Both icons render; CSS shows the right one, so server and client markup match. */}
          <SunIcon className="size-[18px] dark:hidden" aria-hidden />
          <MoonIcon className="hidden size-[18px] dark:block" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-rule font-mono text-xs">
        <DropdownMenuLabel className="label-caps">{t.theme.colors}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme ?? "system"} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <SunIcon aria-hidden /> {t.theme.light}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon aria-hidden /> {t.theme.dark}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon aria-hidden /> {t.theme.system}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {/* The look: the plainer default, or the original tasting form. */}
        <DropdownMenuLabel className="label-caps">{t.theme.look}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={look} onValueChange={(value) => setLook(value as Look)}>
          {LOOKS.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {t.theme.looks[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
