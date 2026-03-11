import React, { useEffect, useState, useRef } from "react";
import FilterBar from "./FilterBar";
import OrdersHeader from "./OrdersHeader";
import { usePaginatedPedidos } from "hooks/usePaginatedPedidos";
import { useOrderDelete } from "./useOrderDelete";
import OrdersRow from "./OrdersRow";
import { MSG } from "components/common/messages";

function OrdersTableBody({ rows, loading, error, onEdit, onDelete, reload }) {
  return (
    <tbody>
      {rows.map((p) => (
        <OrdersRow key={p.id} p={p} onEdit={onEdit} reload={reload} onDelete={(e) => onDelete(p, e)} />
      ))}
      {!loading && rows.length === 0 && !error && (
        <tr><td className="px-3 py-6 text-center opacity-70" colSpan={8}>{MSG.PEDIDOS_EMPTY}</td></tr>
      )}
      {loading && (
        <tr><td className="px-3 py-6 text-center opacity-70" colSpan={8}>{MSG.LOADING_GENERIC}</td></tr>
      )}
      {!loading && error && (
        <tr><td className="px-3 py-6 text-center text-red-600 dark:text-red-400" colSpan={8}>{error}</td></tr>
      )}
    </tbody>
  );
}

function OrdersPaginationFooter({ page, hasMore, loading, total, limit, nextPage, prevPage }) {
  return (
    <div className="flex flex-wrap items-center justify-between mt-2 text-xs gap-3">
      <div className="flex items-center gap-2">
        <button className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] disabled:opacity-40" onClick={prevPage} disabled={page === 0 || loading}>Anterior</button>
        <button className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] disabled:opacity-40" onClick={nextPage} disabled={!hasMore || loading}>Próxima</button>
      </div>
      <div className="opacity-70 flex items-center gap-2">
        <span>Página {page + 1}</span>
        {typeof total === "number" && total >= 0 && (
          <span className="whitespace-nowrap">{total === 0 ? "Nenhum registro" : `Mostrando ${page * limit + 1}–${Math.min((page + 1) * limit, total)} de ${total}`}</span>
        )}
      </div>
    </div>
  );
}

export function OrdersBrowser({ limit = 20, refreshTick = 0, onEdit }) {
  const [filters, setFilters] = useState(() => {
    try {
      const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const partner = params?.get("partner") ?? "";
      const tipo = params?.get("tipo") ?? "";
      if (partner || params?.has("tipo")) {
        const saved = window.localStorage.getItem("orders.filters");
        const p = saved ? (() => { try { const x = JSON.parse(saved); return x && typeof x === "object" ? x : {}; } catch { return {}; } })() : {};
        return { tipo: tipo || p.tipo || "", q: p.q || "", from: p.from || "", to: p.to || "", partner };
      }
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem("orders.filters");
        if (saved) { const p = JSON.parse(saved); if (p && typeof p === "object") return { tipo: "", q: "", from: "", to: "", partner: "", ...p }; }
      }
    } catch (_) { /* ignore */ }
    return { tipo: "", q: "", from: "", to: "", partner: "" };
  });
  const { rows, loading, reload, page, hasMore, nextPage, prevPage, total, limit: effLimit, error } = usePaginatedPedidos(filters, limit);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { const el = tableContainerRef.current; if (el?.scrollTo) try { el.scrollTo({ top: 0, behavior: "smooth" }); } catch (_) { /* noop */ } }, [page, rows]);
  const { requestDelete, dialog: deleteDialog } = useOrderDelete({ onDeleted: reload });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, [refreshTick]);
  const externalReloadPending = useRef(false);
  useEffect(() => {
    const onSetFilters = (e) => { externalReloadPending.current = true; setFilters((prev) => ({ ...prev, ...(e?.detail || {}) })); };
    window.addEventListener("orders:set-filters", onSetFilters);
    return () => window.removeEventListener("orders:set-filters", onSetFilters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (externalReloadPending.current) { externalReloadPending.current = false; reload(); } }, [filters]);
  return (
    <div className="text-sm">
      <FilterBar filters={filters} onChange={setFilters} onReload={reload} />
      <div ref={tableContainerRef} className="overflow-auto border rounded text-xs max-h-[520px]">
        <table className="min-w-full text-xs">
          <OrdersHeader />
          <OrdersTableBody rows={rows} loading={loading} error={error} onEdit={onEdit} onDelete={requestDelete} reload={reload} />
        </table>
      </div>
      <OrdersPaginationFooter page={page} hasMore={hasMore} loading={loading} total={total} limit={effLimit} nextPage={nextPage} prevPage={prevPage} />
      {deleteDialog}
    </div>
  );
}

export { OrdersManager } from "./OrdersManager";
