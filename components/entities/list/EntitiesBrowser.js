import React, { useState, useEffect, useCallback } from "react";
import { usePaginatedEntities } from "hooks/usePaginatedEntities";
import { useToast } from "components/entities/shared/toast";
import { EntitiesFilters } from "./EntitiesFilters";
import { EntitiesTable } from "./EntitiesTable";
import { ConfirmDialog } from "components/common/ConfirmDialog";
import { EntitiesSummary } from "./EntitiesSummary";

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
    summary,
    loading,
    error,
    statusFilter,
    profileFilter,
    searchFilter,
    addressFillFilter,
    contactFillFilter,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    setStatusFilter,
    setProfileFilter,
    setSearchFilter,
    setAddressFillFilter,
    setContactFillFilter,
    goToPage,
    nextPage,
    prevPage,
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
      else reload();
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
          {summary && <EntitiesSummary summary={summary} />}
        </div>
        <EntitiesFilters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          profileFilter={profileFilter}
          onProfileChange={setProfileFilter}
          searchFilter={searchFilter}
          onSearchChange={setSearchFilter}
          loading={loading}
          addressFillFilter={addressFillFilter}
          onAddressFillChange={setAddressFillFilter}
          contactFillFilter={contactFillFilter}
          onContactFillChange={setContactFillFilter}
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
        compact={compact}
        deletingId={deletingId}
        onRowClick={handleEdit}
        highlightId={highlightId}
        onRequestDelete={handleDeleteClick}
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        onGoToPage={goToPage}
        onNextPage={nextPage}
        onPrevPage={prevPage}
      />
      {confirmId && (
        <ConfirmDialog
          title="Excluir entidade"
          message={
            <p className="text-sm leading-relaxed">
              Tem certeza que deseja excluir{" "}
              <strong>{rows.find((r) => r.id === confirmId)?.name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
          }
          confirmLabel={deletingId === confirmId ? "Excluindo..." : "Excluir"}
          cancelLabel="Cancelar"
          danger
          loading={deletingId === confirmId}
          onCancel={closeConfirm}
          onConfirm={() => {
            const row = rows.find((r) => r.id === confirmId);
            if (row) confirmDelete(row);
          }}
        />
      )}
    </div>
  );
}
// Badge e percentuais migraram para EntitiesSummary
