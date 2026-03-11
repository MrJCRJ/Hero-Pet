import React from "react";

export interface DualLineSeriesPoint {
  label: string;
  value: number;
  [key: string]: unknown;
}

export interface DualLineSeries {
  label: string;
  color?: string;
  data: DualLineSeriesPoint[];
}

export interface DualLineHoverSelectPayload {
  label: string;
  a?: DualLineSeriesPoint;
  b?: DualLineSeriesPoint;
}

/* eslint-disable no-unused-vars -- param names in interface are for typing */
export interface DualLineChartProps {
  seriesA?: DualLineSeries | null;
  seriesB?: DualLineSeries | null;
  height?: number;
  onHoverPoint?: (payload: DualLineHoverSelectPayload) => void;
  onSelectPoint?: (payload: DualLineHoverSelectPayload) => void;
  selectedLabel?: string | null;
}

export default function DualLineChart({
  seriesA,
  seriesB,
  height = 200,
  onHoverPoint,
  onSelectPoint,
  selectedLabel,
}: DualLineChartProps) {
  const a = Array.isArray(seriesA?.data) ? seriesA.data : [];
  const b = Array.isArray(seriesB?.data) ? seriesB.data : [];
  const labels = [
    ...new Set([...a.map((d) => d.label), ...b.map((d) => d.label)]),
  ];
  const pointsA = a.filter((d) => labels.includes(d.label));
  const pointsB = b.filter((d) => labels.includes(d.label));
  const allValues = [...pointsA, ...pointsB].map((p) => Number(p.value ?? 0));
  const max = allValues.length ? Math.max(...allValues) : 0;
  const min = 0;
  const paddingX = 30;
  const w = Math.max(labels.length * 50, 420);

  function scaleX(idx: number): number {
    if (labels.length <= 1) return paddingX;
    return paddingX + (idx / (labels.length - 1)) * (w - paddingX * 2);
  }
  function scaleY(v: number): number {
    if (max === min) return height / 2;
    return height - ((v - min) / (max - min)) * (height - 20);
  }

  const linePath = (pts: DualLineSeriesPoint[]): string => {
    if (!pts.length) return "";
    return pts
      .map((p, i) => {
        const idx = labels.indexOf(p.label);
        const x = scaleX(idx);
        const y = scaleY(Number(p.value ?? 0));
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  };

  const pathA = linePath(pointsA);
  const pathB = linePath(pointsB);

  function handlePointer(label: string) {
    if (!label) return;
    const pa = pointsA.find((p) => p.label === label);
    const pb = pointsB.find((p) => p.label === label);
    const composite: DualLineHoverSelectPayload = { label, a: pa, b: pb };
    onHoverPoint?.(composite);
  }
  function handleSelect(label: string) {
    if (!label) return;
    const pa = pointsA.find((p) => p.label === label);
    const pb = pointsB.find((p) => p.label === label);
    const composite: DualLineHoverSelectPayload = { label, a: pa, b: pb };
    onSelectPoint?.(composite);
  }

  return (
    <div className="relative overflow-x-auto">
      <svg width={w} height={height} className="block select-none">
        <line
          x1={paddingX}
          y1={0}
          x2={paddingX}
          y2={height}
          stroke="var(--color-border)"
          strokeWidth={0.5}
        />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = scaleY(min + (max - min) * f);
          return (
            <line
              key={f}
              x1={paddingX}
              y1={y}
              x2={w - paddingX}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth={0.5}
              opacity={0.3}
            />
          );
        })}
        <path
          d={pathA}
          fill="none"
          stroke={seriesA?.color ?? "var(--color-accent)"}
          strokeWidth={2}
        />
        <path
          d={pathB}
          fill="none"
          stroke={seriesB?.color ?? "#f59e0b"}
          strokeWidth={2}
        />
        {labels.map((lbl, idx) => {
          const x = scaleX(idx);
          const pa = pointsA.find((p) => p.label === lbl);
          const pb = pointsB.find((p) => p.label === lbl);
          const selected = selectedLabel === lbl;
          return (
            <g
              key={lbl}
              onMouseEnter={() => handlePointer(lbl)}
              onClick={() => handleSelect(lbl)}
              className="cursor-pointer"
            >
              {pa != null && (
                <circle
                  cx={x}
                  cy={scaleY(pa.value)}
                  r={selected ? 5 : 3}
                  fill={seriesA?.color ?? "var(--color-accent)"}
                />
              )}
              {pb != null && (
                <rect
                  x={x - (selected ? 5 : 3)}
                  y={scaleY(pb.value) - (selected ? 5 : 3)}
                  width={selected ? 10 : 6}
                  height={selected ? 10 : 6}
                  fill={seriesB?.color ?? "#f59e0b"}
                  rx={1}
                />
              )}
              <text
                x={x}
                y={height - 2}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
              >
                {lbl}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
