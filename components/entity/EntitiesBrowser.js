// components/entity/EntitiesBrowser.js
import React from "react";
import { Button } from "components/ui/Button";
import { usePaginatedEntities } from "hooks/usePaginatedEntities";
import { formatCpfCnpj } from "./utils";

// Opções de status reutilizadas em filtro e potencialmente em badges futuras
const STATUS_OPTIONS = ["", "pending", "provisional", "valid"];

// Cabeçalhos da tabela declarativos
const COLUMN_DEFS = [
  { key: "name", label: "Nome" },
  { key: "entity_type", label: "Tipo" },
  { key: "document", label: "Documento" },
  { key: "document_status", label: "Status" },
  { key: "document_pending", label: "Pending?" },
  { key: "created_at", label: "Criado" },
];

// Mapeamento simples para classes de status
const STATUS_CLASS = {
  valid: "badge badge-success",
  pending: "badge badge-warning",
  provisional: "badge badge-info",
};

// Função de formatação do documento (evita lógica inline na célula)
function formatDocumentDigits(row) {
  if (row.document_digits) return formatCpfCnpj(row.document_digits);
  if (row.document_pending) return "(pendente)";
  return "—";
}

// Renderiza grupo de badges de summary (status ou pending) de modo uniforme
function SummaryBadges({ entries, prefix }) {
  if (!entries) return null;
  return Object.entries(entries).map(([k, v]) => (
    <Badge key={prefix + k} label={`${prefix}${k}`} value={v} />
  ));
}

/**
 * Componente de listagem e filtros de Entities reutilizável.
 * Props:
 * - limit: número de registros por página (default 20)
 * - compact: reduz tipografia/padding (para uso inline no dashboard)
 */
export function EntitiesBrowser({ limit = 20, compact = false }) {
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
  } = state;

  const textSize = compact ? "text-xs" : "text-sm";

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
        <select
          id="entities-status-filter"
          disabled={loading}
          className="border rounded px-2 py-1 text-[10px]"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt || "all"} value={opt}>
              {opt || "(todos)"}
            </option>
          ))}
        </select>
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
        <span className="text-[10px] text-gray-500 animate-pulse">
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
}) {
  const sizeCls = compact ? "text-xs" : "text-sm";
  return (
    <div className="border rounded overflow-x-auto">
      <table className={`min-w-full ${sizeCls}`}>
        <thead className="bg-gray-100">
          <tr>
            {COLUMN_DEFS.map((col) => (
              <Th key={col.key}>{col.label}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !loading && (
            <tr>
              <td
                colSpan={COLUMN_DEFS.length}
                className="text-center py-6 text-gray-500"
              >
                Nenhum registro encontrado
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-t hover:bg-gray-50">
              <Td>{r.name}</Td>
              <Td>{r.entity_type}</Td>
              <Td>{formatDocumentDigits(r)}</Td>
              <Td>
                <StatusBadge status={r.document_status} />
              </Td>
              <Td>{r.document_pending ? "Sim" : "Não"}</Td>
              <Td>{new Date(r.created_at).toLocaleDateString()}</Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 text-[10px] text-gray-600">
            <td colSpan={COLUMN_DEFS.length} className="px-3 py-2">
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
