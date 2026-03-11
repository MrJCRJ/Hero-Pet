import React from "react";
import type { FormItem } from "./utils";
import {
  defaultEmptyItem,
  mapEditingOrderToItems,
  computeItemTotal as computeItemTotalPure,
} from "./utils";
import { useItemDiff } from "./useItemDiff";

export function usePedidoItems(
  editingOrder: Record<string, unknown> | null | undefined
) {
  const [itens, setItens] = React.useState<FormItem[]>(() => {
    if (editingOrder) {
      const mapped = mapEditingOrderToItems(editingOrder);
      if (mapped.length) return mapped;
    }
    return [defaultEmptyItem()];
  });
  const [originalItens, setOriginalItens] = React.useState<FormItem[]>([]);

  React.useEffect(() => {
    if (!editingOrder) return;
    const mapped = mapEditingOrderToItems(editingOrder);
    const itensFinais = mapped.length ? mapped : [defaultEmptyItem()];
    setItens(itensFinais);
    setOriginalItens(mapped);
  }, [editingOrder]);

  const updateItem = React.useCallback(
    (idx: number, patch: Partial<FormItem>) => {
      setItens((prev) =>
        prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
      );
    },
    []
  );
  const addItem = React.useCallback((patch?: Partial<FormItem>) => {
    setItens((prev) => [
      ...prev,
      {
        ...defaultEmptyItem(),
        ...(patch && typeof patch === "object" ? patch : {}),
      },
    ]);
  }, []);
  const removeItem = React.useCallback((idx: number) => {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const computeItemTotal = React.useCallback(
    (it: FormItem) => computeItemTotalPure(it),
    [],
  );

  // Agregados básicos para eventual consumo por usePedidoTotals (ou UI simples)
  const totalBruto = React.useMemo(() => {
    return itens.reduce((acc, it) => {
      const q = Number(it.quantidade);
      const p = Number(it.preco_unitario);
      if (Number.isFinite(q) && Number.isFinite(p) && q > 0 && p >= 0) {
        return acc + q * p;
      }
      return acc;
    }, 0);
  }, [itens]);

  const totalDescontos = React.useMemo(() => {
    return itens.reduce((acc, it) => {
      const q = Number(it.quantidade);
      const d = Number(it.desconto_unitario);
      if (Number.isFinite(q) && Number.isFinite(d) && q > 0 && d > 0) {
        return acc + q * d;
      }
      return acc;
    }, 0);
  }, [itens]);

  const totalLiquido = React.useMemo(
    () => Number((totalBruto - totalDescontos).toFixed(2)),
    [totalBruto, totalDescontos],
  );

  const { getItemChanges, getItemDiffClass, getItemDiffIcon } = useItemDiff(
    itens,
    originalItens,
    !!editingOrder,
  );

  return {
    itens,
    setItens,
    originalItens,
    updateItem,
    addItem,
    removeItem,
    computeItemTotal,
    getItemChanges,
    getItemDiffClass,
    getItemDiffIcon,
    totalBruto,
    totalDescontos,
    totalLiquido,
  };
}
