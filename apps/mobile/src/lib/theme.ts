import { useColorScheme } from "react-native";

/**
 * The website's "tasting form" design (apps/web/src/app/globals.css) in React Native terms:
 * off-white paper and black ink, hard rules, one accent. The oklch tokens converted to hex.
 */
const light = {
  background: "#F4F4F1",
  foreground: "#161616",
  muted: "#E6E6E3",
  mutedForeground: "#64645E",
  popover: "#FAFAF8",
  brand: "#CC291F",
  brandForeground: "#FFFFFF",
  destructive: "#CC291F",
  border: "rgba(22, 22, 22, 0.18)",
  input: "rgba(22, 22, 22, 0.35)",
};

const dark: typeof light = {
  background: "#141211",
  foreground: "#ECEBE7",
  muted: "#201F1D",
  mutedForeground: "#A09E99",
  popover: "#1C1A18",
  brand: "#F45343",
  brandForeground: "#141211",
  destructive: "#F45343",
  border: "rgba(236, 235, 231, 0.18)",
  input: "rgba(236, 235, 231, 0.35)",
};

export type Colors = typeof light;

export const fonts = {
  /** Headings: Archivo ExtraBold (the site sets it wider; a phone keeps the plain width). */
  heading: "Archivo_800ExtraBold",
  body: "Archivo_400Regular",
  bodyBold: "Archivo_700Bold",
  /** Labels and data. */
  mono: "IBMPlexMono_500Medium",
};

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}
