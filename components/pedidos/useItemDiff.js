// Hook customizado para lógica de diff e itens
import { useMemo } from "react";

export function useItemDiff(itens, originalItens, editingOrder) {
  // Função para detectar mudanças nos itens
  const getItemChanges = useMemo(() => {
    return function () {
      if (!editingOrder || !originalItens.length)
        return { added: [], removed: [], modified: [] };

      const currentIds = new Set(
        itens.filter((it) => it.produto_id).map((it) => it.produto_id),
      );
      const originalIds = new Set(originalItens.map((it) => it.produto_id));

      const added = itens.filter(
        (it) => it.produto_id && !originalIds.has(it.produto_id),
      );
      const removed = originalItens.filter(
        (it) => !currentIds.has(it.produto_id),
      );
      const modified = itens.filter((it) => {
        if (!it.produto_id || !originalIds.has(it.produto_id)) return false;
        const original = originalItens.find(
          (orig) => orig.produto_id === it.produto_id,
        );
        return (
          original &&
          (Number(original.quantidade) !== Number(it.quantidade) ||
            Number(original.preco_unitario) !== Number(it.preco_unitario) ||
            Number(original.desconto_unitario || 0) !==
              Number(it.desconto_unitario || 0))
        );
      });

      return { added, removed, modified };
    };
  }, [itens, originalItens, editingOrder]);

  // Função para obter classe CSS baseada no status do item
  const getItemDiffClass = useMemo(() => {
    const changes = getItemChanges();
    return function (item) {
      if (!editingOrder || !originalItens.length) return "";

      if (changes.added.some((added) => added.produto_id === item.produto_id)) {
        return "border-green-500 bg-green-50 dark:bg-green-900/20";
      }

      if (
        changes.modified.some(
          (modified) => modified.produto_id === item.produto_id,
        )
      ) {
        return "border-amber-500 bg-amber-50 dark:bg-amber-900/20";
      }

      return "";
    };
  }, [originalItens, editingOrder, getItemChanges]);

  // Função para obter ícone do diff
  const getItemDiffIcon = useMemo(() => {
    const changes = getItemChanges();
    const DiffIcon = function (item) {
      if (!editingOrder || !originalItens.length) return null;

      if (changes.added.some((added) => added.produto_id === item.produto_id)) {
        return <span className="text-green-600 text-xs">✓ Novo</span>;
      }

      if (
        changes.modified.some(
          (modified) => modified.produto_id === item.produto_id,
        )
      ) {
        return <span className="text-amber-600 text-xs">⚠ Alterado</span>;
      }

      return null;
    };
    DiffIcon.displayName = "DiffIcon";
    return DiffIcon;
  }, [originalItens, editingOrder, getItemChanges]);

  return {
    getItemChanges,
    getItemDiffClass,
    getItemDiffIcon,
  };
}
