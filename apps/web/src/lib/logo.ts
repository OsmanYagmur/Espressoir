/**
 * The mark (DESIGN.md → Logo): a coffee bean woven from the site's score bars. Eight rows of
 * rounded bars fill an upright oval, and a gap that swings left and right through them is
 * the bean's crease. One drawing, rendered by the header and the footer (with the CSS
 * colours) and by the icons and share images (with the token values).
 */
const BEAN = { cx: 24, cy: 24, rx: 14.5, ry: 19.5 };
const ROWS = 8;
const ROW_STEP = 4.6;
const BAR_HEIGHT = 3;
/** How far the crease swings from the middle, and half the gap it leaves. */
const CREASE_SWING = 3.6;
const CREASE_GAP = 1.2;

export interface LogoBar {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 0 at the top; the header fills the rows one after another. */
  row: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

export const LOGO_BARS: readonly LogoBar[] = Array.from({ length: ROWS }, (_, row) => {
  const middle = BEAN.cy + (row - (ROWS - 1) / 2) * ROW_STEP;
  const height = (middle - BEAN.cy) / BEAN.ry;
  const half = BEAN.rx * Math.sqrt(1 - height ** 2);
  const crease = BEAN.cx + CREASE_SWING * Math.sin(height * Math.PI);
  return [
    [BEAN.cx - half, crease - CREASE_GAP],
    [crease + CREASE_GAP, BEAN.cx + half],
  ].map(([from = 0, to = 0]) => ({
    x: round(from),
    y: round(middle - BAR_HEIGHT / 2),
    width: round(to - from),
    height: BAR_HEIGHT,
    row,
  }));
}).flat();

/** The bars' box with a little air around it: the mark is taller than it is wide. */
export const LOGO_VIEWBOX = "8 5 32 38";
export const LOGO_ASPECT = 32 / 38;
