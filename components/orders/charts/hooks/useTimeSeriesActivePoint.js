import React from 'react';

/**
 * Hook para gerenciar estado de ponto ativo em séries temporais (hover + seleção) e métricas derivadas.
 * @param {Array<{label:string,value:number}>} chartData
 */
export function useTimeSeriesActivePoint(chartData) {
  const [hovered, setHovered] = React.useState(null);
  const [selected, setSelected] = React.useState(null);

  const fallbackPoint = chartData[chartData.length - 1] || null;
  // Prioridade: hovered (interação atual) > selected (fixado) > fallback (último)
  const activePoint = hovered || selected || fallbackPoint;

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
    if (!activePoint || chartData.length === 0) return null;
    // Usa o primeiro valor não-zero como base. Se todos forem zero, não há crescimento acumulado significativo.
    const basePoint = chartData.find(p => p.value !== 0);
    if (!basePoint) return null; // todos zero
    const baseVal = basePoint.value;
    if (activePoint.label === basePoint.label) return 0; // primeiro ponto válido
    if (baseVal === 0) return null;
    return ((activePoint.value - baseVal) / baseVal) * 100;
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
