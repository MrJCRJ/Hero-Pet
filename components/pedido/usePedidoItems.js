import React from 'react';
import { defaultEmptyItem, mapEditingOrderToItems, computeItemTotal as computeItemTotalPure } from './utils';
import { useItemDiff } from './useItemDiff';

export function usePedidoItems(editingOrder) {
  const [itens, setItens] = React.useState(() => {
    if (editingOrder) {
      const mapped = mapEditingOrderToItems(editingOrder);
      if (mapped.length) return mapped;
    }
    return [defaultEmptyItem()];
  });
  const [originalItens, setOriginalItens] = React.useState([]);

  React.useEffect(() => {
    if (!editingOrder) return;
    const mapped = mapEditingOrderToItems(editingOrder);
    const itensFinais = mapped.length ? mapped : [defaultEmptyItem()];
    setItens(itensFinais);
    setOriginalItens(mapped);
  }, [editingOrder]);

  const updateItem = React.useCallback((idx, patch) => {
    setItens(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }, []);
  const addItem = React.useCallback((patch) => {
    setItens(prev => [...prev, { ...defaultEmptyItem(), ...(patch && typeof patch === 'object' ? patch : {}) }]);
  }, []);
  const removeItem = React.useCallback((idx) => {
    setItens(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const computeItemTotal = React.useCallback(it => computeItemTotalPure(it), []);

  const { getItemChanges, getItemDiffClass, getItemDiffIcon } = useItemDiff(
    itens,
    originalItens,
    editingOrder,
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
  };
}