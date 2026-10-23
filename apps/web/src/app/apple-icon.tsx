import { ImageResponse } from "next/og";

import { IconMark, loadOgFonts } from "@/lib/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The iPhone home-screen icon: square, iOS rounds the corners itself. */
export default function AppleIcon() {
  return new ImageResponse(<IconMark size={size.width} />, { ...size, fonts: loadOgFonts() });
}
