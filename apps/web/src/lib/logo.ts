/**
 * The mark (DESIGN.md → Logo): a cup seen from above, its handle on the right, and in the
 * crema an E drawn with the site's score bars: a stem and three bars of different lengths.
 * One drawing on a 40-unit square, rendered by the header and the footer (with the CSS
 * colours) and by the icons and share images (with the token values).
 */
export const LOGO_VIEWBOX = "0 0 40 40";

export const LOGO = {
  handle: { x: 29.5, y: 15.5, width: 8, height: 9, rx: 4.5, strokeWidth: 3 },
  rim: { cx: 18, cy: 20, r: 16 },
  crema: { cx: 18, cy: 20, r: 12.5 },
  stem: { x: 11, y: 13, width: 3, height: 14, rx: 1.5 },
  bars: [
    { x: 11, y: 13, width: 14, height: 3, rx: 1.5 },
    { x: 11, y: 18.5, width: 10, height: 3, rx: 1.5 },
    { x: 11, y: 24, width: 12, height: 3, rx: 1.5 },
  ],
} as const;
