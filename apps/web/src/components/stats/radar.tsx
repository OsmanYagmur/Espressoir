import { TASTE_MAX, hasRadarShape, radarPoint } from "@espressoir/core";

import { format, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { DataTable } from "./data-table";

export interface RadarAxis {
  label: string;
  /** Null when there is nothing to plot on this corner. */
  value: number | null;
  /** The value as printed ("4/5", "3,7"), prepared by the caller. */
  display: string;
  /** For averages: how many tastings the value rests on. */
  n?: number;
  /** Too few tastings to read much into: drawn hollow and faded. */
  small?: boolean;
}

// Lengths in viewBox units, which are CSS pixels when the chart is at its full width.
const RIM = 78;
const LABEL = RIM + 20;
const BOX = { x: -165, y: -122, width: 330, height: 230 };
const LEVELS = Array.from({ length: TASTE_MAX }, (_, i) => i + 1);

const round = (n: number) => Math.round(n * 100) / 100;

function corner(index: number, count: number, value: number, radius = RIM) {
  const unit = radarPoint(index, count, value);
  return { x: round(unit.x * radius), y: round(unit.y * radius) };
}

const outline = (points: readonly { x: number; y: number }[]) =>
  points.map(({ x, y }) => `${x},${y}`).join(" ");

/**
 * A taste profile as a radar chart: one corner per dimension, the centre is 0 and the rim
 * is the top of the scale. Drawn on the server as plain SVG, in one ink.
 *
 * Follows the rules of the other charts: every corner prints its value (and its `n` when
 * the value is an average), corners resting on too few tastings are hollow and faded, and
 * the same numbers are in a table underneath. With fewer than three corners there is no
 * shape to speak of, so the values are listed instead.
 */
export function Radar({
  axes,
  caption,
  className,
}: {
  axes: readonly RadarAxis[];
  /** What the numbers are, for the table and for people who cannot see the chart. */
  caption: string;
  className?: string;
}) {
  const averages = axes.some((axis) => axis.n !== undefined);
  const known = axes.filter((axis) => axis.value !== null);
  if (known.length === 0) return null;

  const table = (
    <DataTable
      caption={caption}
      columns={
        averages
          ? [t.taste.columns.dimension, t.taste.columns.n, t.taste.columns.mean]
          : [t.taste.columns.dimension, t.taste.columns.value]
      }
      rows={axes.map((axis) =>
        averages ? [axis.label, axis.n ?? 0, axis.display] : [axis.label, axis.display],
      )}
    />
  );

  if (!hasRadarShape(axes.map((axis) => axis.value))) {
    return (
      <dl className={cn("flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs", className)}>
        {known.map((axis) => (
          <div key={axis.label} className={cn("flex gap-2", axis.small && "text-muted-foreground")}>
            <dt className="text-muted-foreground">{axis.label}</dt>
            <dd>
              {axis.display}
              {axis.n !== undefined ? ` · ${format(t.taste.n, { n: axis.n })}` : null}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  const count = axes.length;
  const shape = axes.map((axis, index) => corner(index, count, axis.value ?? 0));
  const summary = axes
    .map((axis) =>
      axis.n !== undefined
        ? `${axis.label} ${axis.display} (${format(t.taste.n, { n: axis.n })})`
        : `${axis.label} ${axis.display}`,
    )
    .join(", ");

  return (
    <figure className={className}>
      <svg
        role="img"
        aria-label={`${t.taste.radarLabel}: ${summary}`}
        viewBox={`${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}`}
        className="w-full max-w-[22rem] font-mono"
      >
        {/* The scale: one ring per level, the rim a little heavier, and the axes. */}
        {LEVELS.map((level) => (
          <polygon
            key={level}
            points={outline(axes.map((_, index) => corner(index, count, level)))}
            className={cn("fill-none", level === TASTE_MAX ? "stroke-rule" : "stroke-border")}
            strokeWidth={1}
          />
        ))}
        {axes.map((axis, index) => {
          const rim = corner(index, count, TASTE_MAX);
          return (
            <line
              key={axis.label}
              x1={0}
              y1={0}
              x2={rim.x}
              y2={rim.y}
              className="stroke-border"
              strokeWidth={1}
            />
          );
        })}
        <text x={5} y={round(-RIM / TASTE_MAX) + 3} className="fill-muted-foreground text-[8px]">
          1
        </text>
        <text x={5} y={-RIM + 3} className="fill-muted-foreground text-[8px]">
          {TASTE_MAX}
        </text>

        <polygon
          points={outline(shape)}
          className="fill-foreground/10 stroke-foreground"
          strokeWidth={1.75}
          strokeLinejoin="round"
        />
        {axes.map((axis, index) => {
          const point = shape[index]!;
          return axis.value === null ? null : (
            <rect
              key={axis.label}
              x={round(point.x - 3.5)}
              y={round(point.y - 3.5)}
              width={7}
              height={7}
              strokeWidth={1.5}
              className={cn(
                "stroke-foreground",
                axis.small ? "fill-background" : "fill-foreground",
              )}
            />
          );
        })}

        {/* Every corner says what it is and what it shows; nothing depends on hovering. */}
        {axes.map((axis, index) => {
          const unit = radarPoint(index, count, TASTE_MAX);
          const x = round(unit.x * LABEL);
          const y = round(unit.y * LABEL) + (unit.y > 0.5 ? 6 : unit.y < -0.5 ? -10 : -4);
          const anchor = unit.x > 0.2 ? "start" : unit.x < -0.2 ? "end" : "middle";
          const faded = axis.value === null || axis.small;
          return (
            <text key={axis.label} textAnchor={anchor} className="text-[11px]">
              <tspan x={x} y={y} className="fill-muted-foreground">
                {axis.label}
              </tspan>
              <tspan
                x={x}
                y={y + 13}
                className={cn("font-medium", faded ? "fill-muted-foreground" : "fill-foreground")}
              >
                {axis.display}
                {axis.n !== undefined ? (
                  <tspan className="fill-muted-foreground font-normal">
                    {` · ${format(t.taste.n, { n: axis.n }).replaceAll(" ", "")}`}
                  </tspan>
                ) : null}
              </tspan>
            </text>
          );
        })}
      </svg>
      {axes.some((axis) => axis.small && axis.value !== null) ? (
        <p className="mt-1 max-w-[42ch] font-mono text-xs text-muted-foreground">
          {t.taste.smallNote}
        </p>
      ) : null}
      {table}
    </figure>
  );
}
