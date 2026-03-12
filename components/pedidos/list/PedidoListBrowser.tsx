/* eslint-disable no-unused-vars -- param names in interface are for typing */
import React from "react";
import { ConfirmDialog } from "components/common/ConfirmDialog";
import { useToast } from "components/entities/shared/toast";
import { deleteOrder as deleteOrderService } from "components/pedidos/service";
import FilterBar from "components/pedidos/orders/FilterBar";
import { boundsFromYYYYMM } from "components/pedidos/orders/shared/utils";
import { usePaginatedPedidos } from "hooks/usePaginatedPedidos";
import { MSG } from "components/common/messages";
import PedidoListRow from "./PedidoListRow";
import PedidoListHeader from "./PedidoListHeader";

interface PedidoListBrowserProps {
  limit?: number;
  refreshTick?: number;
  onEdit?: (_row: Record<string, unknown>) => void;
  monthFilter?: string | null;
}

export function PedidoListBrowser({
  limit = 20,
  refreshTick = 0,
  onEdit,
  monthFilter,
}: PedidoListBrowserProps) {
  const {
    filters,
    setFilters,
    rows,
    loading,
    reload,
    page,
    hasMore,
    nextPage,
    prevPage,
    total,
    limit: effLimit,
    error,
  } = usePaginatedPedidos({ tipo: "", q: "", from: "", to: "" }, limit);
  const tableContainerRef = React.useRef<HTMLDivElement | null>(null);
  const { push } = useToast();

  React.useEffect(() => {
    reload();
  }, [refreshTick, reload]);

  React.useEffect(() => {
    const onSetFilters = (e: Event) => {
      const detail = ((e as CustomEvent)?.detail || {}) as Record<string, string>;
      setFilters((prev: Record<string, string>) => ({ ...prev, ...detail }));
    };
    window.addEventListener("orders:set-filters", onSetFilters);
    return () => window.removeEventListener("orders:set-filters", onSetFilters);
  }, [setFilters]);

  React.useEffect(() => {
    if (monthFilter && /^\d{4}-\d{2}$/.test(monthFilter)) {
      const { from, to } = boundsFromYYYYMM(monthFilter) || {};
      if (from && to) {
        setFilters((prev) => ({ ...prev, from, to }));
      }
    }
  }, [monthFilter, setFilters]);

  React.useEffect(() => {
    const el = tableContainerRef.current;
    if (el && typeof el.scrollTo === "function") {
      try {
        el.scrollTo({ top: 0, behavior: "smooth" });
      } catch (_) {
        /* noop */
      }
    }
  }, [page, rows]);

  const [confirmingOrder, setConfirmingOrder] = React.useState<{
    id: number;
  } | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const requestDelete = (
    p: { id: number },
    e: React.MouseEvent | undefined
  ) => {
    e?.stopPropagation?.();
    setConfirmingOrder(p);
  };

  const performDelete = async () => {
    if (!confirmingOrder) return;
    try {
      setDeleting(true);
      await deleteOrderService(confirmingOrder.id);
      push(`Pedido #${confirmingOrder.id} excluído.`, { type: "success" });
      setConfirmingOrder(null);
      await reload();
    } catch (e) {
      push(e.message || "Falha ao excluir pedido", { type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="text-sm">
      <FilterBar filters={filters} onChange={setFilters} onReload={reload} />
      <div
        ref={tableContainerRef}
        className="overflow-auto border rounded text-xs max-h-[520px]"
      >
        <table className="min-w-full text-xs">
          <PedidoListHeader />
          <tbody>
            {rows.map((p: Record<string, unknown> & { id: number }) => (
              <PedidoListRow
                key={p.id}
                p={p}
                onEdit={onEdit}
                reload={reload}
                onDelete={(e) => requestDelete(p, e)}
              />
            ))}
            {!loading && rows.length === 0 && !error && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={9}>
                  {MSG.PEDIDOS_EMPTY}
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={9}>
                  {MSG.LOADING_GENERIC}
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td
                  className="px-3 py-6 text-center text-red-600 dark:text-red-400"
                  colSpan={9}
                >
                  {error}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between mt-2 text-xs gap-3">
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] disabled:opacity-40"
            onClick={prevPage}
            disabled={page === 0 || loading}
          >
            Anterior
          </button>
          <button
            className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] disabled:opacity-40"
            onClick={nextPage}
            disabled={!hasMore || loading}
          >
            Próxima
          </button>
        </div>
        <div className="opacity-70 flex items-center gap-2">
          <span>Página {page + 1}</span>
          {typeof total === "number" && total >= 0 && (
            <span className="whitespace-nowrap">
              {total === 0
                ? "Nenhum registro"
                : `Mostrando ${page * effLimit + 1}–${Math.min((page + 1) * effLimit, total)} de ${total}`}
            </span>
          )}
        </div>
      </div>
      {confirmingOrder && (
        <ConfirmDialog
          title={`Excluir Pedido #${confirmingOrder.id}`}
          message={`Tem certeza que deseja excluir o pedido #${confirmingOrder.id}?\n\nEsta ação também remove itens, movimentos de estoque e parcelas associadas. Não pode ser desfeita.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          danger
          loading={deleting}
          onCancel={() => !deleting && setConfirmingOrder(null)}
          onConfirm={performDelete}
        />
      )}
    </div>
  );
}
