import React from "react";
import { computeItemTotal as computeItemTotalPure } from "./utils";

export function usePedidoTotals({
  itensRef,
  tipoRef,
  numeroPromissoriasRef,
  setValorPorPromissoria,
  freteRef,
}) {
  const computeItemTotal = React.useCallback(
    (it) => computeItemTotalPure(it),
    [],
  );

  const subtotal = React.useCallback(() => {
    const itens = itensRef.current || [];
    const sum = itens.reduce((acc, it) => {
      const t = computeItemTotal(it);
      return acc + (Number.isFinite(Number(t)) ? Number(t) : 0);
    }, 0);
    return Number(sum.toFixed(2));
  }, [computeItemTotal, itensRef]);

  const totalDescontos = React.useCallback(() => {
    const itens = itensRef.current || [];
    return Number(
      itens
        .reduce((acc, it) => {
          const q = Number(it.quantidade);
          const d = Number(it.desconto_unitario);
          if (Number.isFinite(q) && Number.isFinite(d) && q > 0 && d > 0)
            return acc + q * d;
          return acc;
        }, 0)
        .toFixed(2),
    );
  }, [itensRef]);

  const totalLiquido = React.useCallback(() => {
    const base = subtotal();
    const desc = totalDescontos();
    const frete =
      tipoRef.current === "COMPRA" ? Number(freteRef?.current || 0) : 0;
    return Number(
      (base - desc + (Number.isFinite(frete) ? frete : 0)).toFixed(2),
    );
  }, [subtotal, totalDescontos, tipoRef, freteRef]);

  const computeOrderTotalEstimate = totalLiquido;

  const computeLucroBruto = React.useCallback(() => {
    if (tipoRef.current !== "VENDA") return 0;
    const itens = itensRef.current || [];
    try {
      return Number(
        itens
          .reduce((acc, it) => {
            const qtd = Number(it.quantidade || 0);
            const preco =
              Number(it.preco_unitario || 0) -
              Number(it.desconto_unitario || 0);
            const custoRaw = Number(
              it.custo_fifo_unitario != null
                ? it.custo_fifo_unitario
                : it.custo_base_unitario,
            );
            if (
              qtd > 0 &&
              preco > 0 &&
              Number.isFinite(custoRaw) &&
              custoRaw > 0
            ) {
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

  const computeLucroPercent = React.useCallback(() => {
    if (tipoRef.current !== "VENDA") return 0;
    const lucro = computeLucroBruto();
    const receita = subtotal();
    if (!receita) return 0;
    return Number(((lucro / receita) * 100).toFixed(2));
  }, [computeLucroBruto, subtotal, tipoRef]);

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
    setValorPorPromissoria((v) => (v !== next ? next : v));
  }, [
    itensRef,
    numeroPromissoriasRef,
    computeItemTotal,
    setValorPorPromissoria,
  ]);

  return {
    computeItemTotal,
    computeOrderTotalEstimate,
    computeLucroBruto,
    computeLucroPercent,
    subtotal,
    totalDescontos,
    totalLiquido,
  };
}
