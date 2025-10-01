import React from 'react';
import { computeItemTotal as computeItemTotalPure } from './utils';

export function usePedidoTotals({ itensRef, tipoRef, numeroPromissoriasRef, setValorPorPromissoria }) {
  const computeItemTotal = React.useCallback(it => computeItemTotalPure(it), []);

  const computeOrderTotalEstimate = React.useCallback(() => {
    const itens = itensRef.current || [];
    const sum = itens.reduce((acc, it) => {
      const t = computeItemTotal(it);
      return acc + (Number.isFinite(Number(t)) ? Number(t) : 0);
    }, 0);
    return Number(sum.toFixed(2));
  }, [computeItemTotal, itensRef]);

  const computeLucroBruto = React.useCallback(() => {
    if (tipoRef.current !== 'VENDA') return 0;
    const itens = itensRef.current || [];
    try {
      return Number(
        itens
          .reduce((acc, it) => {
            const qtd = Number(it.quantidade || 0);
            const preco = Number(it.preco_unitario || 0) - Number(it.desconto_unitario || 0);
            const custoRaw = Number(
              it.custo_fifo_unitario != null ? it.custo_fifo_unitario : it.custo_base_unitario,
            );
            if (qtd > 0 && preco > 0 && Number.isFinite(custoRaw) && custoRaw > 0) {
              return acc + (preco - custoRaw) * qtd;
            }
            return acc;
          }, 0)
          .toFixed(2),
      );
    } catch {
      return 0;
    }
  }, [itensRef, tipoRef]);

  // Recalcular valor por promissoria quando total/numero mudam
  React.useEffect(() => {
    const itens = itensRef.current || [];
    const numero = Number(numeroPromissoriasRef.current || 0);
    if (!numero || numero <= 0) return;
    const sum = itens.reduce((acc, it) => {
      const t = computeItemTotal(it);
      return acc + (Number.isFinite(Number(t)) ? Number(t) : 0);
    }, 0);
    const next = Number((sum / numero).toFixed(2));
    setValorPorPromissoria(v => (v !== next ? next : v));
  }, [itensRef, numeroPromissoriasRef, computeItemTotal, setValorPorPromissoria]);

  return { computeItemTotal, computeOrderTotalEstimate, computeLucroBruto };
}