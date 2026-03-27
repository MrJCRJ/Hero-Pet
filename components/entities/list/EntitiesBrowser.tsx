"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePaginatedEntities } from "hooks/usePaginatedEntities";
import { useToast } from "components/entities/shared/toast";
import { EntitiesFilters } from "./EntitiesFilters";
import { EntitiesTable } from "./EntitiesTable";
import { ConfirmDialog } from "components/common/ConfirmDialog";
import { EntitiesSummary } from "./EntitiesSummary";
import type { Entity } from "@/types";

/* eslint-disable no-unused-vars -- callback param names in interface */
interface EntitiesBrowserProps {
  limit?: number;
  compact?: boolean;
  onEdit?: (row: Entity) => void;
  onDuplicate?: (row: Entity) => void | Promise<void>;
  onDeleted?: (id: number) => void;
  highlightId?: number | string | null;
}
/* eslint-enable no-unused-vars */

export function EntitiesBrowser({
  limit = 20,
  compact = false,
  onEdit,
  onDuplicate,
  onDeleted,
  highlightId,
}: EntitiesBrowserProps) {
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
    hasOrdersFilter,
    setHasOrdersFilter,
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
    clearFilters,
  } = state;
  const router = useRouter();
  const searchParams = useSearchParams();
  const entityRows = rows as Entity[];
  const textSize = compact ? "text-xs" : "text-sm";
  const { push } = useToast();
  const [advancedOpen, setAdvancedOpen] = useState(
    () => searchParams?.get("advanced") === "1"
  );
  const initFromUrlRef = React.useRef(false);

  // Ler filtros da URL na montagem
  useEffect(() => {
    if (initFromUrlRef.current) return;
    initFromUrlRef.current = true;
    const q = searchParams?.get("q") ?? "";
    const profile = searchParams?.get("profile") ?? "";
    const status = searchParams?.get("status") ?? "";
    const addr = searchParams?.get("address_fill") ?? "";
    const contact = searchParams?.get("contact_fill") ?? "";
    const hasOrders = searchParams?.get("has_orders") ?? "";
    const pageParam = searchParams?.get("page");
    const pageVal = pageParam ? Math.max(0, parseInt(pageParam, 10) - 1) : 0;
    if (q || profile || status || addr || contact || hasOrders || pageVal > 0) {
      setSearchFilter(q);
      setProfileFilter(profile);
      setStatusFilter(status);
      setAddressFillFilter(addr);
      setContactFillFilter(contact);
      setHasOrdersFilter(hasOrders);
      goToPage(pageVal);
    }
  }, [searchParams, setSearchFilter, setProfileFilter, setStatusFilter, setAddressFillFilter, setContactFillFilter, setHasOrdersFilter, goToPage]);

  // Persistir filtros na URL (evitar loop: só atualizar se diferente)
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchFilter) params.set("q", searchFilter);
    if (profileFilter) params.set("profile", profileFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (addressFillFilter) params.set("address_fill", addressFillFilter);
    if (contactFillFilter) params.set("contact_fill", contactFillFilter);
    if (hasOrdersFilter) params.set("has_orders", hasOrdersFilter);
    if (currentPage > 1) params.set("page", String(currentPage));
    if (advancedOpen) params.set("advanced", "1");
    const qs = params.toString();
    const desired = qs ? `?${qs}` : "";
    const current = window.location.search || "";
    if (desired !== current) {
      router.replace(`/entities${desired}`, { scroll: false });
    }
  }, [
    searchFilter,
    profileFilter,
    statusFilter,
    addressFillFilter,
    contactFillFilter,
    hasOrdersFilter,
    currentPage,
    advancedOpen,
    router,
  ]);
  const hasActiveFilters = !!(
    statusFilter ||
    profileFilter ||
    searchFilter ||
    addressFillFilter ||
    contactFillFilter ||
    hasOrdersFilter
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setAdvancedOpen(false);
    router.replace("/entities");
  }, [clearFilters, router]);

  const handleAdvancedToggle = useCallback(() => {
    setAdvancedOpen((prev) => !prev);
  }, []);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [localRemovedIds, setLocalRemovedIds] = useState<number[]>([]);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);

  const buildExportUrl = useCallback(
    (format: "csv" | "xlsx") => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (profileFilter === "supplier") {
        params.set("entity_type", "PJ");
      } else if (profileFilter === "reseller") {
        params.set("entity_type", "PF");
        params.set("tipo_cliente", "pessoa_juridica");
      } else if (profileFilter === "final_customer") {
        params.set("entity_type", "PF");
        params.set("tipo_cliente", "pessoa_fisica");
      }
      if (searchFilter) params.set("q", searchFilter);
      if (addressFillFilter) params.set("address_fill", addressFillFilter);
      if (contactFillFilter) params.set("contact_fill", contactFillFilter);
      if (hasOrdersFilter) params.set("has_orders", hasOrdersFilter);
      params.set("format", format);
      return `/api/v1/entities?${params.toString()}`;
    },
    [
      statusFilter,
      profileFilter,
      searchFilter,
      addressFillFilter,
      contactFillFilter,
      hasOrdersFilter,
    ],
  );

  const handleExport = useCallback(
    async (format: "csv" | "xlsx") => {
      setExporting(format);
      try {
        const url = buildExportUrl(format);
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/login";
            return;
          }
          throw new Error(`Exportação falhou: ${res.status}`);
        }
        const blob = await res.blob();
        const ext = format === "csv" ? "csv" : "xlsx";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `entidades.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
        push(`Exportação ${ext.toUpperCase()} concluída.`, { type: "success" });
      } catch (e) {
        push(e instanceof Error ? e.message : "Erro na exportação", {
          type: "error",
        });
      } finally {
        setExporting(null);
      }
    },
    [buildExportUrl, push],
  );

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
  const [duplicatingId, setDuplicatingId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  async function handleDuplicateClick(e: React.MouseEvent, row: Entity) {
    e.stopPropagation();
    if (!onDuplicate) return;
    setDuplicatingId(row.id);
    try {
      await onDuplicate(row);
    } catch (err) {
      push(err instanceof Error ? err.message : "Erro ao duplicar", {
        type: "error",
        timeout: 5000,
      });
    } finally {
      setDuplicatingId(null);
    }
  }

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      setImporting(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        const res = await fetch("/api/v1/entities/import", {
          method: "POST",
          body: formData,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || `Falha na importação (${res.status})`);
        }
        const { imported, skipped, errors } = data;
        const msg =
          imported > 0
            ? `Importação concluída: ${imported} entidade(s).${skipped > 0 ? ` ${skipped} ignorada(s).` : ""}`
            : "Nenhuma entidade importada.";
        push(msg, {
          type: imported > 0 ? "success" : "warn",
          timeout: 5000,
        });
        if (errors?.length > 0 && errors.length <= 5) {
          errors.forEach((err: { row: number; message: string }) =>
            push(`Linha ${err.row}: ${err.message}`, { type: "warn", timeout: 4000 })
          );
        } else if (errors?.length > 5) {
          push(`${errors.length} erros na importação. Verifique o arquivo.`, {
            type: "warn",
            timeout: 4000,
          });
        }
        if (imported > 0) reload();
      } catch (err) {
        push(err instanceof Error ? err.message : "Erro ao importar", {
          type: "error",
          timeout: 5000,
        });
      } finally {
        setImporting(false);
      }
    },
    [push, reload],
  );

  return (
    <div className={`space-y-4 ${textSize}`}>
      <input
        ref={importInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImportFile}
        aria-hidden
      />
      {summary && (
        <div className="mb-4">
          <EntitiesSummary summary={summary} />
        </div>
      )}
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
        hasOrdersFilter={hasOrdersFilter}
        onHasOrdersChange={setHasOrdersFilter}
        advancedOpen={advancedOpen}
        onAdvancedToggle={handleAdvancedToggle}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        onExportCsv={() => handleExport("csv")}
        onExportExcel={() => handleExport("xlsx")}
        onImportCsv={handleImportClick}
        exporting={exporting}
        importing={importing}
      />
      {error && (
        <div className="text-red-600 text-xs border border-red-300 bg-red-50 px-3 py-2 rounded">
          {error}
        </div>
      )}
      <EntitiesTable
        rows={
          entityRows.filter((r) => !localRemovedIds.includes(r.id)) as unknown as Array<
            Record<string, unknown> & { id: number; entity_type?: string; orders_count?: number }
          >
        }
        loading={loading}
        compact={compact}
        deletingId={deletingId}
        onRowClick={handleEdit}
        highlightId={highlightId}
        onRequestDelete={handleDeleteClick}
        onRequestDuplicate={
          onDuplicate
            ? (e, row) => handleDuplicateClick(e, row as unknown as Entity)
            : undefined
        }
        duplicatingId={duplicatingId}
        onCopySuccess={() => push("Copiado para a área de transferência.", { type: "success", timeout: 2000 })}
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
              <strong>{entityRows.find((r) => r.id === confirmId)?.name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
          }
          confirmLabel={deletingId === confirmId ? "Excluindo..." : "Excluir"}
          cancelLabel="Cancelar"
          danger
          loading={deletingId === confirmId}
          onCancel={closeConfirm}
          onConfirm={() => {
            const row = entityRows.find((r) => r.id === confirmId);
            if (row) confirmDelete(row);
          }}
        />
      )}
    </div>
  );
}
// Badge e percentuais migraram para EntitiesSummary
