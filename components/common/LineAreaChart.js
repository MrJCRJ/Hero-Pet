import React from "react";

/**
 * LineAreaChart
 * Props:
 *  - data: [{ label: 'YYYY-MM', value: number, extra?: any }]
 *  - width (default 640)
 *  - height (default 220)
 *  - formatValue (fn)
 *  - showArea (bool)
 *  - colorVar (css var string) default '--color-accent'
 *  - tooltipRender(point) -> JSX/string (optional)
 *  - footerRender(points, stats) -> JSX (optional)
 *  - valueFormatterLabel? show value scale labels at right (boolean)
 */
export default function LineAreaChart({
  data,
  loading = false,
  width = 640,
  height = 220,
  showArea = true,
  colorVar = "--color-accent",
  formatValue = (v) =>
    v.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  tooltipRender,
  footerRender,
  valueFormatterLabel = true,
  onHover,
  disableTooltip = false,
  enableCrosshair = false,
  onSelectPoint,
  selectedLabel,
}) {
  const [hover, setHover] = React.useState(null);
  const handleHover = (pt) => {
    setHover(pt);
    if (onHover) onHover(pt);
  };
  const handleClick = (pt) => {
    if (onSelectPoint) onSelectPoint(pt);
  };
  if (loading) return <div className="py-4 text-sm">Carregando...</div>;
  if (!Array.isArray(data) || !data.length)
    return <div className="py-4 text-sm opacity-70">Sem dados.</div>;
  const parsed = data.filter(
    (d) => d && typeof d.value === "number" && Number.isFinite(d.value),
  );
  if (!parsed.length)
    return <div className="py-4 text-sm opacity-70">Sem dados válidos.</div>;
  const min = Math.min(...parsed.map((p) => p.value));
  const max = Math.max(...parsed.map((p) => p.value));
  const range = max - min || 1;
  const padX = 24;
  const padY = 14;
  const step = (width - padX * 2) / Math.max(1, parsed.length - 1);
  const points = parsed.map((p, i) => {
    const x = padX + i * step;
    const y = padY + (1 - (p.value - min) / range) * (height - padY * 2);
    return { ...p, x, y };
  });
  const pathD = points
    .map(
      (pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`,
    )
    .join(" ");
  const areaD =
    pathD +
    ` L${points[points.length - 1].x},${height - padY} L${points[0].x},${height - padY} Z`;
  const first = points[0].value;
  const last = points[points.length - 1].value;
  const deltaAbs = last - first;
  const deltaPct = first !== 0 ? (deltaAbs / first) * 100 : 0;
  const gridLines = Array.from({ length: 5 }).map((_, i) => {
    const y = padY + ((height - padY * 2) * i) / 4;
    const val = max - (range * i) / 4;
    return { y, val };
  });
  const stats = { min, max, deltaAbs, deltaPct, first, last };

  return (
    <div className="max-w-full overflow-x-auto space-y-3">
      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
        <span>
          Min {formatValue(min)} • Max {formatValue(max)}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded font-medium ${deltaAbs === 0 ? "bg-[var(--color-bg-tertiary)]" : deltaAbs > 0 ? "bg-green-600/20 text-green-500" : "bg-red-600/20 text-red-400"}`}
          title={`Variação de ${formatValue(first)} para ${formatValue(last)}`}
        >
          {deltaAbs === 0
            ? "Sem variação"
            : `${deltaAbs > 0 ? "+" : ""}${formatValue(deltaAbs)} (${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[520px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] rounded"
      >
        <defs>
          {showArea && (
            <linearGradient id="lineAreaFill" x1="0" x2="0" y1="0" y2="1">
              <stop
                offset="0%"
                stopColor={`var(${colorVar})`}
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor={`var(${colorVar})`}
                stopOpacity="0"
              />
            </linearGradient>
          )}
        </defs>
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padX}
              x2={width - padX}
              y1={g.y}
              y2={g.y}
              stroke="var(--color-border)"
              strokeDasharray="3 4"
              strokeWidth={0.5}
            />
            {valueFormatterLabel && (
              <text
                x={width - padX + 4}
                y={g.y + 3}
                fontSize={9}
                textAnchor="start"
                fill="var(--color-text-secondary)"
              >
                {formatValue(g.val)}
              </text>
            )}
          </g>
        ))}
        {showArea && <path d={areaD} fill="url(#lineAreaFill)" stroke="none" />}
        <path
          d={pathD}
          fill="none"
          stroke={`var(${colorVar})`}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((pt, i) => {
          const isSelected = selectedLabel && selectedLabel === pt.label;
          const isHover = hover && hover.label === pt.label;
          return (
            <g key={i}>
              <rect
                x={pt.x - step / 2}
                y={0}
                width={step || 24}
                height={height}
                fill="transparent"
                onMouseEnter={() => handleHover(pt)}
                onMouseLeave={() => handleHover(null)}
                onClick={() => handleClick(pt)}
              />
              {enableCrosshair && (isHover || isSelected) && (
                <line
                  x1={pt.x}
                  x2={pt.x}
                  y1={padY}
                  y2={height - padY}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isSelected ? 6 : isHover ? 5 : 3}
                fill={`var(${colorVar})`}
                stroke="var(--color-bg-primary)"
                strokeWidth={isSelected ? 2 : 1}
              />
              <text
                x={pt.x}
                y={height - 6}
                fontSize={11}
                textAnchor="middle"
                fill={
                  isHover || isSelected
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)"
                }
                fontWeight={isHover || isSelected ? 600 : 400}
              >
                {pt.label.slice(5)}
              </text>
            </g>
          );
        })}
        {!disableTooltip && hover && !selectedLabel && (
          <g>
            <rect
              x={hover.x - 60}
              y={hover.y - 48}
              width={120}
              height={40}
              rx={4}
              fill="var(--color-bg-primary)"
              stroke="var(--color-border)"
              strokeWidth={0.5}
            />
            <text
              x={hover.x}
              y={hover.y - 33}
              fontSize={10}
              textAnchor="middle"
              fill="var(--color-text-primary)"
            >
              {hover.label}
            </text>
            <text
              x={hover.x}
              y={hover.y - 21}
              fontSize={11}
              textAnchor="middle"
              fill={`var(${colorVar})`}
            >
              {formatValue(hover.value)}
            </text>
            {tooltipRender && (
              <foreignObject
                x={hover.x - 55}
                y={hover.y - 18}
                width={110}
                height={16}
              >
                {tooltipRender(hover, stats)}
              </foreignObject>
            )}
          </g>
        )}
      </svg>
      {footerRender && footerRender(points, stats)}
    </div>
  );
}
