import React from "react";
import { ROW_HOVER, ACTION_BTN_HIDDEN } from "components/common/tableStyles";
import { Button } from "components/ui/Button";
import { formatCpfCnpj } from "../shared/masks";
import {
  classifyAddress,
  classifyContact,
  FILL_CLASS,
} from "lib/validation/completeness";

const COLUMN_DEFS = [
  { key: "name", label: "Nome" },
  { key: "profile", label: "Perfil" },
  { key: "document", label: "Documento" },
  { key: "document_status", label: "Status" },
  { key: "address_status", label: "Endereço" },
  { key: "contact_status", label: "Contato" },
  { key: "ativo", label: "Ativo" },
];

const STATUS_CLASS = {
  valid:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-green-600/10 text-green-700 dark:text-green-300 border border-green-600/30",
  pending:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-600/30",
  provisional:
    "px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-600/30",
};

function Th({ children }) {
  return <th className="text-left px-3 py-2 font-medium">{children}</th>;
}
function Td({ children }) {
  return <td className="px-3 py-2 whitespace-nowrap align-top">{children}</td>;
}
function StatusBadge({ status }) {
  return <span className={STATUS_CLASS[status] || "badge"}>{status}</span>;
}

function formatDocumentDigits(row) {
  if (row.document_digits) return formatCpfCnpj(row.document_digits);
  if (row.document_pending) return "(pendente)";
  return "—";
}

function getProfileLabel(entity_type) {
  if (entity_type === "PF") return "Cliente";
  if (entity_type === "PJ") return "Fornecedor";
  return "—";
}

function ProfileIcon({ entity_type }) {
  // Ícones simples por perfil: Cliente (👤), Fornecedor (🏪)
  if (entity_type === "PF") return <span aria-hidden="true">👤</span>;
  if (entity_type === "PJ") return <span aria-hidden="true">🏪</span>;
  return null;
}

export function EntitiesTable({
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
    <div className="border rounded overflow-auto max-h-[520px]">
      <table className={`min-w-full ${sizeCls}`}>
        <thead className="sticky top-0 z-10 shadow-sm after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-[-6px] after:h-4 after:pointer-events-none after:bg-gradient-to-b after:from-[var(--color-bg-secondary)]/70 after:to-transparent bg-[var(--color-bg-secondary)]/95 backdrop-blur">
          <tr className="relative text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
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
                className={`${ROW_HOVER} transition-colors ${highlighted ? "bg-yellow-100 dark:bg-yellow-900/30 ring-1 ring-yellow-400/60" : ""}`}
                onClick={() => onRowClick && onRowClick(r)}
                tabIndex={0}
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
                <Td>
                  <span
                    className="inline-flex items-center justify-center badge badge-soft"
                    aria-label={getProfileLabel(r.entity_type)}
                    title={getProfileLabel(r.entity_type)}
                  >
                    <ProfileIcon entity_type={r.entity_type} />
                    <span className="sr-only">
                      {getProfileLabel(r.entity_type)}
                    </span>
                  </span>
                </Td>
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
                    className={`p-1 rounded transition-colors text-[var(--color-text-secondary)] hover:text-red-600 hover:bg-red-600/10 disabled:opacity-50 disabled:cursor-not-allowed ${ACTION_BTN_HIDDEN} ${deletingId === r.id ? "animate-pulse !opacity-100" : ""}`}
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
          <tr className="bg-[var(--color-bg-secondary)] text-[10px]">
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
