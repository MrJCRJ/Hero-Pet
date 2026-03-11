/* eslint-disable no-unused-vars -- param names in types are for typing */
import React from "react";
import type { LineAreaChartPointWithCoords } from "../../../../common/LineAreaChart";

interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Hook para gerenciar estado de ponto ativo em séries temporais (hover + seleção) e métricas derivadas.
 */
export function useTimeSeriesActivePoint(
  chartData: ChartPoint[]
): {
  hovered: LineAreaChartPointWithCoords | ChartPoint | null;
  setHovered: React.Dispatch<
    React.SetStateAction<LineAreaChartPointWithCoords | ChartPoint | null>
  >;
  selected: LineAreaChartPointWithCoords | ChartPoint | null;
  setSelected: React.Dispatch<
    React.SetStateAction<LineAreaChartPointWithCoords | ChartPoint | null>
  >;
  activePoint: LineAreaChartPointWithCoords | ChartPoint | null;
  prevPoint: ChartPoint | null;
  momPct: number | null;
  acumuladaPct: number | null;
  toggleSelect: (
    point: LineAreaChartPointWithCoords | ChartPoint | null
  ) => void;
} {
  const [hovered, setHovered] = React.useState<
    LineAreaChartPointWithCoords | ChartPoint | null
  >(null);
  const [selected, setSelected] = React.useState<
    LineAreaChartPointWithCoords | ChartPoint | null
  >(null);

  const fallbackPoint = chartData[chartData.length - 1] || null;
  // Prioridade: hovered (interação atual) > selected (fixado) > fallback (último)
  const activePoint = hovered || selected || fallbackPoint;

  const prevPoint = React.useMemo(() => {
    if (!activePoint) return null;
    const idx = chartData.findIndex((p) => p.label === activePoint.label);
    return idx > 0 ? chartData[idx - 1] : null;
  }, [activePoint, chartData]);

  const momPct = React.useMemo(() => {
    if (!activePoint || !prevPoint || prevPoint.value === 0) return null;
    return ((activePoint.value - prevPoint.value) / prevPoint.value) * 100;
  }, [activePoint, prevPoint]);

  const acumuladaPct = React.useMemo(() => {
    if (!activePoint || chartData.length === 0) return null;
    // Usa o primeiro valor não-zero como base. Se todos forem zero, não há crescimento acumulado significativo.
    const basePoint = chartData.find((p) => p.value !== 0);
    if (!basePoint) return null; // todos zero
    const baseVal = basePoint.value;
    if (activePoint.label === basePoint.label) return 0; // primeiro ponto válido
    if (baseVal === 0) return null;
    return ((activePoint.value - baseVal) / baseVal) * 100;
  }, [activePoint, chartData]);

  function toggleSelect(
    point: LineAreaChartPointWithCoords | ChartPoint | null
  ) {
    setSelected(
      point && selected && point.label === selected.label ? null : point,
    );
  }

  return {
    hovered,
    setHovered,
    selected,
    setSelected,
    activePoint,
    prevPoint,
    momPct,
    acumuladaPct,
    toggleSelect,
  };
}
