import React, { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "../ui/Button";
import { PedidoForm } from "../PedidoForm";
import { useToast } from "../entities/shared/toast";
import { deleteOrder as deleteOrderService } from "../pedido/service";
import { ConfirmDialog } from "../common/ConfirmDialog";
import FilterBar from "./FilterBar";
// import { usePedidos } from "./shared/hooks"; // legacy (remoção futura) - não usado após migração
import { usePaginatedPedidos } from "hooks/usePaginatedPedidos";
import { MSG } from "components/common/messages";
import OrdersRow from "./OrdersRow";
import OrdersHeader from "./OrdersHeader";
import OrdersDashboard from "./dashboard/OrdersDashboard";

// Formatação movida para components/common/date

// FilterBar extraído para ./FilterBar

// usePedidos extraído para ./hooks

export function OrdersBrowser({ limit = 20, refreshTick = 0, onEdit }) {
  const [filters, setFilters] = useState(() => {
    try {
      const saved = window.localStorage.getItem('orders.filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { tipo: '', q: '', from: '', to: '', ...parsed };
        }
      }
    } catch (_) { /* ignore */ }
    return { tipo: "", q: "", from: "", to: "" };
  });
  // Novo hook paginado (mantém fallback antigo se resposta não vier com meta)
  const { rows, loading, reload, page, hasMore, nextPage, prevPage, total, limit: effLimit, error } = usePaginatedPedidos(filters, limit);
  const tableContainerRef = useRef(null);

  // Scroll para topo quando página mudar
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [page, rows]);
  const { push } = useToast();
  useEffect(() => {
    // quando refreshTick muda, recarrega
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  // Permite que o Dashboard/Modais ajustem os filtros da lista
  const externalReloadPending = useRef(false);
  useEffect(() => {
    const onSetFilters = (e) => {
      const detail = e?.detail || {};
      externalReloadPending.current = true;
      setFilters((prev) => ({ ...prev, ...detail }));
    };
    window.addEventListener("orders:set-filters", onSetFilters);
    return () => window.removeEventListener("orders:set-filters", onSetFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Após filtros mudarem via evento externo, dispara reload automaticamente 1x
  useEffect(() => {
    if (externalReloadPending.current) {
      externalReloadPending.current = false;
      reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const requestDelete = (p, e) => {
    e?.stopPropagation?.();
    setConfirmingOrder(p);
  };

  const performDelete = async () => {
    if (!confirmingOrder) return;
    try {
      setDeleting(true);
      await deleteOrderService(confirmingOrder.id);
      push(MSG.ORDER_DELETED_SUCCESS(confirmingOrder.id), { type: "success" });
      setConfirmingOrder(null);
      await reload();
    } catch (err) {
      push(err.message || MSG.PEDIDO_DELETE_ERROR, { type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="text-sm">
      <FilterBar filters={filters} onChange={setFilters} onReload={reload} />
      <div ref={tableContainerRef} className="overflow-auto border rounded text-xs max-h-[520px]">
        <table className="min-w-full text-xs">
          <OrdersHeader />
          <tbody>
            {rows.map((p) => (
              <OrdersRow
                key={p.id}
                p={p}
                onEdit={onEdit}
                reload={reload}
                onDelete={(e) => requestDelete(p, e)}
              />
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={8}>
                  {MSG.PEDIDOS_EMPTY}
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={8}>
                  {MSG.LOADING_GENERIC}
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td className="px-3 py-6 text-center text-red-600 dark:text-red-400" colSpan={8}>
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
          {typeof total === 'number' && total >= 0 && (
            <span className="whitespace-nowrap">
              {total === 0
                ? 'Nenhum registro'
                : `Mostrando ${page * effLimit + 1}–${Math.min((page + 1) * effLimit, total)} de ${total}`}
            </span>
          )}
        </div>
      </div>
      {confirmingOrder && (
        <ConfirmDialog
          title={MSG.ORDER_DELETE_CONFIRM_TITLE(confirmingOrder.id)}
          message={MSG.ORDER_DELETE_CONFIRM_MESSAGE(confirmingOrder.id)}
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

export function OrdersManager({ limit = 20 }) {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState(null); // pedido completo quando editando
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  // Removido: lógica de migrar pedidos FIFO em lote (legacyCount)

  const handleEdit = async (row) => {
    try {
      const res = await fetch(`/api/v1/pedidos/${row.id}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar pedido");
      setEditing(json);
      setShowForm(true);
    } catch (e) {
      console.error(e);
    }
  };

  if (!showForm) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <h2 className="text-lg font-semibold flex items-center gap-3">
            Pedidos
          </h2>
          <Button
            onClick={() => setShowForm(true)}
            variant="primary"
            fullWidth={false}
          >
            Adicionar
          </Button>
        </div>
        {/* Dashboard resumido acima da lista */}
        <OrdersDashboard />
        <OrdersBrowser
          limit={limit}
          refreshTick={refreshKey}
          onConfirm={bump}
          onEdit={handleEdit}
        />
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl shadow-lg p-7 max-w-[1024px] w-full mx-auto mt-4">
      <div className="max-w-full">
        <h2 className="text-xl font-bold mb-1 border-b border-[var(--color-border)] pb-2">
          Pedido
        </h2>
        <div className="max-w-full overflow-x-auto space-y-6 p-1.5">
          <PedidoForm
            editingOrder={editing}
            onCreated={() => {
              setShowForm(false);
              setEditing(null);
              bump();
            }}
            onSaved={() => {
              setShowForm(false);
              setEditing(null);
              bump();
            }}
          />
          <div className="flex justify-end mt-2">
            <Button
              variant="secondary"
              fullWidth={false}
              onClick={() => {
                setShowForm(false);
                setEditing(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// PayPromissoriaModal extraído para ./PayPromissoriaModal
