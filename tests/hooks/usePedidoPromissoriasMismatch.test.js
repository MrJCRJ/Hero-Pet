import { renderHook, act } from '@testing-library/react';
import { usePedidoPromissorias } from 'components/pedido/usePedidoPromissorias';

describe('usePedidoPromissorias mismatch', () => {
  it('detecta mismatch e depois corrige quando valorPorPromissoria ajustado', () => {
    const { result } = renderHook(() => usePedidoPromissorias(null));
    // setup: 3 promissórias de 100 => soma 300
    act(() => {
      result.current.setNumeroPromissorias(3);
      result.current.setValorPorPromissoria(100);
    });
    let cmp = result.current.computePromissoriasMismatch(250); // totalLiquido hipotético
    expect(cmp.sumPromissorias).toBe(300);
    expect(cmp.mismatch).toBe(true);
    expect(cmp.diff).toBe(50);

    // Corrige ajustando valor unitário para 83.3333 -> ~250 com arredondamento (aceita pequena diferença <=0.01)
    act(() => {
      result.current.setValorPorPromissoria(83.3333);
    });
    cmp = result.current.computePromissoriasMismatch(250);
    // Arredondamento pode resultar em 250 exato dependendo de floating point
    expect(cmp.sumPromissorias).toBeCloseTo(250, 2);
    expect(Math.abs(cmp.diff)).toBeLessThanOrEqual(0.01);
    expect(cmp.mismatch).toBe(false);
  });
});
