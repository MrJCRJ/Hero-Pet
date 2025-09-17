import React, { useState, useEffect, useCallback } from "react";
import { usePaginatedEntities } from "hooks/usePaginatedEntities";
import { useToast } from "components/entities/shared/toast";
import { EntitiesFilters } from "./EntitiesFilters";
import { EntitiesTable } from "./EntitiesTable";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

function SummaryBadges({ entries, prefix }) {
  if (!entries) return null;
  return Object.entries(entries).map(([k, v]) => (
    <Badge key={prefix + k} label={`${prefix}${k}`} value={v} />
  ));
}

// Percentual agregado de completude: mostra quanto já está completo
function AggregatePercent({ summary }) {
  if (!summary) return null;
  const addr = summary.percent_address_fill?.completo ?? 0;
  const contact = summary.percent_contact_fill?.completo ?? 0;
  // Para status do documento consideramos percentual de 'valid'
  const valid = (() => {
    const totalStatus = Object.values(summary.by_status || {}).reduce(
      (a, b) => a + b,
      0,
    );
    const validCount = summary.by_status?.valid || 0;
    return totalStatus
      ? Number(((validCount / totalStatus) * 100).toFixed(1))
      : 0;
  })();
  return (
    <div className="flex gap-2 flex-wrap text-[10px]">
      <Badge label="% Doc. válidos" value={`${valid}%`} />
      <Badge label="% Endereço completo" value={`${addr}%`} />
      <Badge label="% Contato completo" value={`${contact}%`} />
    </div>
  );
}

export function EntitiesBrowser({
  limit = 20,
  compact = false,
  onEdit,
  onDeleted,
  highlightId,
} = {}) {
  const state = usePaginatedEntities({ limit });
  const {
    rows,
    total,
    summary,
    loading,
    loadingMore,
    error,
    statusFilter,
    profileFilter,
    canLoadMore,
    setStatusFilter,
    setProfileFilter,
    loadMore,
    reload,
  } = state;
  const textSize = compact ? "text-xs" : "text-sm";
  const { push } = useToast();
  const [deletingId, setDeletingId] = useState(null);
  const [localRemovedIds, setLocalRemovedIds] = useState([]);
  const [confirmId, setConfirmId] = useState(null);

  const closeConfirm = useCallback(() => setConfirmId(null), []);
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") closeConfirm();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeConfirm]);

  async function confirmDelete(row) {
    if (deletingId) return;
    setDeletingId(row.id);
    setLocalRemovedIds((prev) => [...prev, row.id]); // otimista
    try {
      const res = await fetch(`/api/v1/entities/${row.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Falha ao excluir (status ${res.status})`,
        );
      }
      push(`Registro ${row.name} removido.`);
      if (onDeleted) onDeleted(row.id);
      else if (rows.length === 1 && canLoadMore) reload();
    } catch (e) {
      push(e.message, { type: "error", timeout: 6000 });
      setLocalRemovedIds((prev) => prev.filter((id) => id !== row.id));
    } finally {
      setDeletingId(null);
      closeConfirm();
    }
  }

  function handleDeleteClick(e, row) {
    e.stopPropagation();
    setConfirmId(row.id);
  }
  function handleEdit(row) {
    onEdit
      ? onEdit(row)
      : push("Callback de edição não implementado", {
        type: "warn",
        timeout: 3000,
      });
  }
  return (
    <div className={`space-y-4 ${textSize}`}>
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="space-y-2">
          <h2 className={`font-semibold ${compact ? "text-sm" : "text-base"}`}>
            Entidades Cadastradas
          </h2>
          <p className={`${compact ? "text-[10px]" : "text-xs"} text-gray-500`}>
            Filtros não bloqueiam uso de outras ações.
          </p>
          {summary && (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2 flex-wrap text-[10px]">
                <Badge label="Total" value={summary.total} />
                <SummaryBadges entries={summary.by_status} prefix="Status:" />
                {summary.by_pending && (
                  <SummaryBadges
                    entries={summary.by_pending}
                    prefix="Pending:"
                  />
                )}
                {summary.by_address_fill && (
                  <SummaryBadges
                    entries={summary.by_address_fill}
                    prefix="Endereço:"
                  />
                )}
                {summary.by_contact_fill && (
                  <SummaryBadges
                    entries={summary.by_contact_fill}
                    prefix="Contato:"
                  />
                )}
              </div>
              <AggregatePercent summary={summary} />
            </div>
          )}
        </div>
        <EntitiesFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          profileFilter={profileFilter}
          onProfileChange={setProfileFilter}
          loading={loading}
          addressFillFilter={state.addressFillFilter}
          onAddressFillChange={state.setAddressFillFilter}
          contactFillFilter={state.contactFillFilter}
          onContactFillChange={state.setContactFillFilter}
        />
      </div>
      {error && (
        <div className="text-red-600 text-xs border border-red-300 bg-red-50 px-3 py-2 rounded">
          {error}
        </div>
      )}
      <EntitiesTable
        rows={rows.filter((r) => !localRemovedIds.includes(r.id))}
        loading={loading}
        total={total}
        onLoadMore={loadMore}
        canLoadMore={canLoadMore}
        loadingMore={loadingMore}
        compact={compact}
        deletingId={deletingId}
        onRowClick={handleEdit}
        highlightId={highlightId}
        onRequestDelete={handleDeleteClick}
      />
      {confirmId && (
        <DeleteConfirmModal
          open={!!confirmId}
          onClose={closeConfirm}
          onConfirm={() => {
            const row = rows.find((r) => r.id === confirmId);
            if (row) confirmDelete(row);
          }}
          loading={deletingId === confirmId}
          entity={rows.find((r) => r.id === confirmId)}
        />
      )}
    </div>
  );
}
function Badge({ label, value }) {
  return (
    <span className="badge badge-soft">
      <strong className="mr-1">{label}:</strong> {value}
    </span>
  );
}
