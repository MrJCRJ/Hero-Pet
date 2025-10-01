import { renderHook, act } from '@testing-library/react';
import { useTimeSeriesActivePoint } from '../../components/orders/charts/hooks/useTimeSeriesActivePoint';

// Helper para montar dados simples
const buildData = (values) => values.map((v, i) => ({ label: `M${i + 1}`, value: v }));

describe('useTimeSeriesActivePoint acumuladaPct', () => {
  test('retorna null quando série vazia', () => {
    const { result } = renderHook(() => useTimeSeriesActivePoint([]));
    expect(result.current.acumuladaPct).toBeNull();
  });

  test('retorna 0 no primeiro ponto não-zero', () => {
    const data = buildData([0, 0, 100, 120]);
    const { result } = renderHook(() => useTimeSeriesActivePoint(data));
    // fallbackPoint é último ponto (M4)
    // basePoint é M3 (100) -> acumuladaPct = ((120-100)/100)*100 = 20%
    expect(result.current.activePoint.label).toBe('M4');
    expect(Math.round(result.current.acumuladaPct)).toBe(20);
  });

  test('navega seleção e calcula acumuladaPct corretamente', () => {
    const data = buildData([0, 200, 220, 300]);
    const { result } = renderHook(() => useTimeSeriesActivePoint(data));
    // fallback (M4): base=M2(200) => ((300-200)/200)=50%
    expect(Math.round(result.current.acumuladaPct)).toBe(50);

    // Seleciona M2 (primeiro não-zero) => 0%
    act(() => {
      result.current.toggleSelect({ label: 'M2', value: 200 });
    });
    expect(result.current.activePoint.label).toBe('M2');
    expect(result.current.acumuladaPct).toBe(0);

    // Hover em M3 => ((220-200)/200)=10%
    act(() => {
      result.current.setHovered({ label: 'M3', value: 220 });
    });
    // Seleção continua M2, mas hovered tem precedência para activePoint
    expect(result.current.activePoint.label).toBe('M3');
    expect(Math.round(result.current.acumuladaPct)).toBe(10);
  });

  test('todos zeros => acumuladaPct null', () => {
    const data = buildData([0, 0, 0]);
    const { result } = renderHook(() => useTimeSeriesActivePoint(data));
    expect(result.current.acumuladaPct).toBeNull();
  });
});
