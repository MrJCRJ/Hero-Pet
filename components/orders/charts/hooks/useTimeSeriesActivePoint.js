import React from 'react';

/**
 * Hook para gerenciar estado de ponto ativo em séries temporais (hover + seleção) e métricas derivadas.
 * @param {Array<{label:string,value:number}>} chartData
 */
export function useTimeSeriesActivePoint(chartData) {
  const [hovered, setHovered] = React.useState(null);
  const [selected, setSelected] = React.useState(null);

  const fallbackPoint = chartData[chartData.length - 1] || null;
  const activePoint = selected || hovered || fallbackPoint;

  const prevPoint = React.useMemo(() => {
    if (!activePoint) return null;
    const idx = chartData.findIndex(p => p.label === activePoint.label);
    return idx > 0 ? chartData[idx - 1] : null;
  }, [activePoint, chartData]);

  const momPct = React.useMemo(() => {
    if (!activePoint || !prevPoint || prevPoint.value === 0) return null;
    return ((activePoint.value - prevPoint.value) / prevPoint.value) * 100;
  }, [activePoint, prevPoint]);

  const acumuladaPct = React.useMemo(() => {
    if (!activePoint || chartData.length === 0) return 0;
    const firstVal = chartData[0].value;
    if (firstVal === 0) return 0;
    return ((activePoint.value - firstVal) / firstVal) * 100;
  }, [activePoint, chartData]);

  function toggleSelect(point) {
    setSelected(point && selected && point.label === selected.label ? null : point);
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
