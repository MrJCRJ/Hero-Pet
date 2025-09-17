import React, { useState, useEffect, useCallback } from "react";
import { Button } from "components/ui/Button";
import { usePaginatedEntities } from "hooks/usePaginatedEntities";
import { formatCpfCnpj } from "../shared/masks";
import { useToast } from "components/entities/shared/toast";
import {
  classifyAddress,
  classifyContact,
  FILL_CLASS,
} from "lib/validation/completeness";

const STATUS_OPTIONS = ["", "pending", "provisional", "valid"];
const COLUMN_DEFS = [
  { key: "name", label: "Nome" },
  { key: "entity_type", label: "Tipo" },
  { key: "document", label: "Documento" },
  { key: "document_status", label: "Status" },
  { key: "address_status", label: "Endereço" },
  { key: "contact_status", label: "Contato" },
  { key: "ativo", label: "Ativo" },
];

// Classes simples para badges de status (poderia reutilizar componentes se existirem)
const STATUS_CLASS = {
  valid:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-green-600/10 text-green-700 dark:text-green-300 border border-green-600/30",
  pending:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-600/30",
  provisional:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-600/30",
};

// (classifyAddress / classifyContact / FILL_CLASS movidos para util compartilhado)

function formatDocumentDigits(row) {
  if (row.document_digits) return formatCpfCnpj(row.document_digits);
  if (row.document_pending) return "(pendente)";
  return "—";
}

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
    pendingOnly,
    canLoadMore,
    setStatusFilter,
    setPendingOnly,
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
        <Filters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          pendingOnly={pendingOnly}
          onPendingChange={setPendingOnly}
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
      <Table
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
        <DeleteModal
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

const FILL_OPTIONS = ["", "completo", "parcial", "vazio"];

function Filters({
  statusFilter,
  onStatusChange,
  pendingOnly,
  onPendingChange,
  loading,
  addressFillFilter,
  onAddressFillChange,
  contactFillFilter,
  onContactFillChange,
}) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col">
        <label
          htmlFor="entities-status-filter"
          className="text-[10px] font-medium mb-1"
        >
          Status
        </label>
        <div className="relative">
          <select
            id="entities-status-filter"
            disabled={loading}
            className="peer appearance-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 backdrop-blur-sm rounded px-2 py-1 text-[10px] pr-6 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 focus:ring-offset-[var(--color-bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--color-bg-secondary)]"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option
                key={opt || "all"}
                value={opt}
                className="text-[var(--color-text-primary)]"
              >
                {opt || "(todos)"}
              </option>
            ))}
          </select>
          {/* Ícone seta custom */}
          <span
            className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[8px] text-[var(--color-text-secondary)] peer-focus:text-[var(--color-accent)] transition-colors"
            aria-hidden="true"
          >
            ▼
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        <label
          htmlFor="entities-address-fill"
          className="text-[10px] font-medium mb-1"
        >
          Endereço
        </label>
        <div className="relative">
          <select
            id="entities-address-fill"
            disabled={loading}
            className="peer appearance-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 backdrop-blur-sm rounded px-2 py-1 text-[10px] pr-6 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
            value={addressFillFilter}
            onChange={(e) => onAddressFillChange(e.target.value)}
          >
            {FILL_OPTIONS.map((opt) => (
              <option key={opt || "all"} value={opt}>
                {opt || "(todos)"}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[8px] text-[var(--color-text-secondary)]"
            aria-hidden="true"
          >
            ▼
          </span>
        </div>
      </div>
      <div className="flex flex-col">
        <label
          htmlFor="entities-contact-fill"
          className="text-[10px] font-medium mb-1"
        >
          Contato
        </label>
        <div className="relative">
          <select
            id="entities-contact-fill"
            disabled={loading}
            className="peer appearance-none border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/70 backdrop-blur-sm rounded px-2 py-1 text-[10px] pr-6 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-1 hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
            value={contactFillFilter}
            onChange={(e) => onContactFillChange(e.target.value)}
          >
            {FILL_OPTIONS.map((opt) => (
              <option key={opt || "all"} value={opt}>
                {opt || "(todos)"}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[8px] text-[var(--color-text-secondary)]"
            aria-hidden="true"
          >
            ▼
          </span>
        </div>
      </div>
      <label className="flex items-center gap-2 text-[10px] cursor-pointer">
        <input
          type="checkbox"
          checked={pendingOnly}
          disabled={loading}
          onChange={(e) => onPendingChange(e.target.checked)}
        />
        Apenas pending
      </label>
      {loading && (
        <span className="text-[10px] text-[var(--color-text-secondary)] animate-pulse">
          Carregando...
        </span>
      )}
    </div>
  );
}

function Table({
  rows,
  loading,
  total,
  onLoadMore,
  canLoadMore,
  loadingMore,
  compact,
  deletingId,
  onRowClick,
  highlightId,
  onRequestDelete,
}) {
  const sizeCls = compact ? "text-xs" : "text-sm";
  return (
    <div className="border rounded overflow-x-auto">
      <table className={`min-w-full ${sizeCls}`}>
        <thead className="bg-[var(--color-bg-secondary)]">
          <tr>
            {COLUMN_DEFS.map((col) => (
              <Th key={col.key}>{col.label}</Th>
            ))}
            <Th>Ações</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !loading && (
            <tr>
              <td
                colSpan={COLUMN_DEFS.length + 1}
                className="text-center py-6 "
              >
                Nenhum registro encontrado
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const highlighted = r.id === highlightId;
            const addr = classifyAddress(r);
            const contact = classifyContact(r);
            const isPartial = addr === "parcial" || contact === "parcial";
            return (
              <tr
                key={r.id}
                className={`border-t cursor-pointer transition-colors ${highlighted ? "bg-yellow-100 dark:bg-yellow-900/30 ring-1 ring-yellow-400/60" : "hover:bg-[var(--color-bg-secondary)]"}`}
                onClick={() => onRowClick && onRowClick(r)}
              >
                <Td>
                  <span className="inline-flex items-center gap-1">
                    {r.name}
                    {isPartial && (
                      <span
                        className="text-amber-500/70 dark:text-amber-300/80"
                        aria-label="Dados parciais"
                        title="Alguns dados de endereço ou contato ainda faltando"
                      >
                        ⚠
                      </span>
                    )}
                  </span>
                </Td>
                <Td>{r.entity_type}</Td>
                <Td>{formatDocumentDigits(r)}</Td>
                <Td>
                  <StatusBadge status={r.document_status} />
                </Td>
                <Td>
                  <span className={FILL_CLASS[addr]}>{addr}</span>
                </Td>
                <Td>
                  <span className={FILL_CLASS[contact]}>{contact}</span>
                </Td>
                <Td>{r.ativo ? "Sim" : "Não"}</Td>
                <Td>
                  <button
                    type="button"
                    aria-label="Excluir"
                    onClick={(e) => onRequestDelete(e, r)}
                    disabled={deletingId === r.id}
                    className={`p-1 rounded transition-colors text-[var(--color-text-secondary)] hover:text-red-600 hover:bg-red-600/10 disabled:opacity-50 disabled:cursor-not-allowed ${deletingId === r.id ? "animate-pulse" : ""}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" />
                      <path d="M10 6V4h4v2" />
                    </svg>
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-[var(--color-bg-secondary)] text-[10px] ">
            <td colSpan={COLUMN_DEFS.length + 1} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span>
                  {" "}
                  Total exibido: {rows.length} / Total filtrado: {total}{" "}
                </span>
                <div className="flex items-center gap-2">
                  {loading && (
                    <span className="text-[10px] text-gray-500 animate-pulse">
                      Carregando...
                    </span>
                  )}
                  {canLoadMore && (
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      onClick={onLoadMore}
                      loading={loadingMore}
                    >
                      Carregar mais
                    </Button>
                  )}
                  {!canLoadMore && !loading && rows.length > 0 && (
                    <span className="text-[10px] text-gray-500">
                      Fim dos resultados
                    </span>
                  )}
                </div>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Th({ children }) {
  return <th className="text-left px-3 py-2 font-medium">{children}</th>;
}
function Td({ children }) {
  return <td className="px-3 py-2 whitespace-nowrap align-top">{children}</td>;
}
function StatusBadge({ status }) {
  return <span className={STATUS_CLASS[status] || "badge"}>{status}</span>;
}
function Badge({ label, value }) {
  return (
    <span className="badge badge-soft">
      <strong className="mr-1">{label}:</strong> {value}
    </span>
  );
}

// Modal central de confirmação de exclusão
function DeleteModal({ open, onClose, onConfirm, loading, entity }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
        onClick={loading ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar exclusão"
        className="relative z-50 w-full max-w-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl p-5 space-y-4 animate-scale-in"
      >
        <h3 className="text-sm font-semibold">Confirmar exclusão</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Tem certeza que deseja excluir <strong>{entity?.name}</strong>? Esta
          ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={loading}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            loading={loading}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </div>
    </div>
  );
}
