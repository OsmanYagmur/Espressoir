import { ImageResponse } from "next/og";

import { IconMark, loadOgFonts } from "@/lib/og";

/**
 * The favicon and the home-screen icons of the web app manifest (`/icon/192`, `/icon/512`,
 * `/icon/maskable`), drawn at build time from the tokens. The maskable one keeps the mark
 * inside the middle 80 % that a launcher may keep.
 */
const ICONS = [
  { id: "32", size: 32, scale: 0.92, rounded: true },
  { id: "192", size: 192, scale: 0.72, rounded: true },
  { id: "512", size: 512, scale: 0.72, rounded: true },
  { id: "maskable", size: 512, scale: 0.58, rounded: false },
] as const;

export function generateImageMetadata() {
  return ICONS.map(({ id, size }) => ({
    id,
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const wanted = String(await id);
  const icon = ICONS.find((candidate) => candidate.id === wanted) ?? ICONS[0];
  return new ImageResponse(
    <IconMark size={icon.size} scale={icon.scale} rounded={icon.rounded} />,
    { width: icon.size, height: icon.size, fonts: loadOgFonts() },
  );
}
