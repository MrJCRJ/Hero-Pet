import React, { useState } from "react";
import { Button } from "components/ui/Button";
import { usePaginatedEntities } from "hooks/usePaginatedEntities";
import { formatCpfCnpj } from "../shared/masks";
import { useToast } from "components/entities/shared/toast";

const STATUS_OPTIONS = ["", "pending", "provisional", "valid"];
const COLUMN_DEFS = [
  { key: "name", label: "Nome" },
  { key: "entity_type", label: "Tipo" },
  { key: "document", label: "Documento" },
  { key: "document_status", label: "Status" },
  { key: "document_pending", label: "Pending?" },
  { key: "created_at", label: "Criado" },
];
const STATUS_CLASS = {
  valid: "badge badge-success",
  pending: "badge badge-warning",
  provisional: "badge badge-info",
};

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

export function EntitiesBrowser({
  limit = 20,
  compact = false,
  onEdit, // callback(row)
  onDeleted, // callback(id)
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
  // Hook de toast sempre chamado; provider garantido na página principal
  const { push } = useToast();
  const [deletingId, setDeletingId] = useState(null);

  async function handleDelete(row) {
    if (deletingId) return;
    if (!window.confirm(`Confirma exclusão de ${row.name}?`)) return;
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/v1/entities/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Falha ao excluir (status ${res.status})`);
      }
      push(`Registro ${row.name} removido.`);
      if (onDeleted) onDeleted(row.id);
      else reload();
    } catch (e) {
      push(e.message, { type: "error", timeout: 6000 });
    } finally {
      setDeletingId(null);
    }
  }
  function handleEdit(row) {
    if (onEdit) onEdit(row);
    else push("Callback de edição não implementado", { type: "warn", timeout: 3000 });
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
            <div className="flex gap-2 flex-wrap text-[10px]">
              <Badge label="Total" value={summary.total} />
              <SummaryBadges entries={summary.by_status} prefix="Status:" />
              <SummaryBadges entries={summary.by_pending} prefix="Pending:" />
            </div>
          )}
        </div>
        <Filters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          pendingOnly={pendingOnly}
          onPendingChange={setPendingOnly}
          loading={loading}
        />
      </div>
      {error && (
        <div className="text-red-600 text-xs border border-red-300 bg-red-50 px-3 py-2 rounded">
          {error}
        </div>
      )}
      <Table
        rows={rows}
        loading={loading}
        total={total}
        onLoadMore={loadMore}
        canLoadMore={canLoadMore}
        loadingMore={loadingMore}
        compact={compact}
        onDeleteRow={handleDelete}
        deletingId={deletingId}
        onRowClick={handleEdit}
      />
    </div>
  );
}

function Filters({
  statusFilter,
  onStatusChange,
  pendingOnly,
  onPendingChange,
  loading,
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
  onDeleteRow,
  deletingId,
  // reutiliza handleEdit via closure externa? usaremos data-click
  onRowClick,
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
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-t hover:bg-[var(--color-bg-secondary)] cursor-pointer"
              onClick={() => onRowClick && onRowClick(r)}
            >
              <Td>{r.name}</Td>
              <Td>{r.entity_type}</Td>
              <Td>{formatDocumentDigits(r)}</Td>
              <Td>
                <StatusBadge status={r.document_status} />
              </Td>
              <Td>{r.document_pending ? "Sim" : "Não"}</Td>
              <Td>{new Date(r.created_at).toLocaleDateString()}</Td>
              <Td>
                <button
                  type="button"
                  aria-label="Excluir"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRow(r);
                  }}
                  disabled={deletingId === r.id}
                  className={`p-1 rounded hover:bg-[var(--color-bg-secondary)] transition-colors text-[var(--color-text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed ${deletingId === r.id ? "animate-pulse" : ""
                    }`}
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
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-[var(--color-bg-secondary)] text-[10px] ">
            <td colSpan={COLUMN_DEFS.length + 1} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span>
                  Total exibido: {rows.length} / Total filtrado: {total}
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
