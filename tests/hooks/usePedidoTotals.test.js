import { renderHook } from '@testing-library/react';
import { usePedidoTotals } from 'components/pedido/usePedidoTotals';

// Util simples para construir refs mutáveis aceitas pelo hook
function buildRefs({ itens, tipo = 'VENDA', numeroPromissorias = 1, frete = '' }) {
  const itensRef = { current: itens };
  const tipoRef = { current: tipo };
  const numeroPromissoriasRef = { current: numeroPromissorias };
  const freteRef = { current: frete }; // novo suporte a frete
  return { itensRef, tipoRef, numeroPromissoriasRef, freteRef };
}

describe('usePedidoTotals', () => {
  it('calcula subtotal, descontos e totalLiquido com desconto aplicado (VENDA)', () => {
    const itens = [
      { quantidade: 2, preco_unitario: 50, desconto_unitario: 5 }, // total item = (50-5)*2 = 90
      { quantidade: 1, preco_unitario: 20, desconto_unitario: 0 }, // total item = 20
    ];
    const { itensRef, tipoRef, numeroPromissoriasRef, freteRef } = buildRefs({ itens });
    const { result } = renderHook(() => usePedidoTotals({ itensRef, tipoRef, numeroPromissoriasRef, setValorPorPromissoria: () => { }, freteRef }));
    expect(result.current.subtotal()).toBe(110); // 90 + 20 (subtotal antes de descontos = soma dos computeItemTotal)
    expect(result.current.totalDescontos()).toBe(10); // (5*2) = 10
    expect(result.current.totalLiquido()).toBe(100); // 110 - 10
  });

  it('retorna lucro bruto negativo e percent apropriado quando custos superam preço (VENDA)', () => {
    const itens = [
      { quantidade: 3, preco_unitario: 10, desconto_unitario: 0, custo_fifo_unitario: 12 }, // perda (10-12)*3 = -6
    ];
    const { itensRef, tipoRef, numeroPromissoriasRef, freteRef } = buildRefs({ itens });
    const { result } = renderHook(() => usePedidoTotals({ itensRef, tipoRef, numeroPromissoriasRef, setValorPorPromissoria: () => { }, freteRef }));
    expect(result.current.subtotal()).toBe(30);
    expect(result.current.computeLucroBruto()).toBe(-6);
    // lucro% = -6 / 30 * 100 = -20
    expect(result.current.computeLucroPercent()).toBe(-20);
  });

  it('soma frete apenas quando tipo = COMPRA', () => {
    const itensCompra = [
      { quantidade: 2, preco_unitario: 40, desconto_unitario: 0 }, // total 80
    ];
    const { itensRef, tipoRef, numeroPromissoriasRef, freteRef } = buildRefs({ itens: itensCompra, tipo: 'COMPRA', frete: 15 });
    const { result } = renderHook(() => usePedidoTotals({ itensRef, tipoRef, numeroPromissoriasRef, setValorPorPromissoria: () => { }, freteRef }));
    expect(result.current.totalLiquido()).toBe(95); // 80 + 15

    // Comparação com VENDA (não deve somar frete)
    const refsVenda = buildRefs({ itens: itensCompra, tipo: 'VENDA', frete: 15 });
    const { result: resultVenda } = renderHook(() => usePedidoTotals({ ...refsVenda, setValorPorPromissoria: () => { } }));
    expect(resultVenda.current.totalLiquido()).toBe(80);
  });

  it('retorna zeros coerentes quando itens têm custo/preço zero', () => {
    const itens = [
      { quantidade: 3, preco_unitario: 0, desconto_unitario: 0 },
      { quantidade: 1, preco_unitario: 0, desconto_unitario: 0 },
    ];
    const { itensRef, tipoRef, numeroPromissoriasRef, freteRef } = buildRefs({ itens });
    const { result } = renderHook(() => usePedidoTotals({ itensRef, tipoRef, numeroPromissoriasRef, setValorPorPromissoria: () => { }, freteRef }));
    expect(result.current.subtotal()).toBe(0);
    expect(result.current.totalDescontos()).toBe(0);
    expect(result.current.totalLiquido()).toBe(0);
    expect(result.current.computeLucroBruto()).toBe(0);
    expect(result.current.computeLucroPercent()).toBe(0);
  });
});
