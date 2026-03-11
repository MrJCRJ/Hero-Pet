import React, { useCallback } from "react";
import Link from "next/link";
import { User, Building2, Inbox, AlertCircle, Trash2, Copy, CopyPlus, ExternalLink } from "lucide-react";
import { ROW_HOVER, ACTION_BTN_HIDDEN } from "components/common/tableStyles";
import { formatCpfCnpj } from "../shared/masks";
import { Pagination } from "./Pagination";
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
  { key: "pedidos", label: "Pedidos" },
  { key: "ativo", label: "Ativo" },
];

const STATUS_LABEL: Record<string, string> = {
  valid: "Válido",
  pending: "Pendente",
  provisional: "Provisório",
};
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
function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span className={STATUS_CLASS[status] || "badge"}>{label}</span>
  );
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

function ProfileIcon({ entity_type }: { entity_type: string }) {
  if (entity_type === "PF")
    return <User className="h-4 w-4" aria-hidden />;
  if (entity_type === "PJ")
    return <Building2 className="h-4 w-4" aria-hidden />;
  return null;
}

function CopyButton({
  value,
  label,
  onCopied,
}: {
  value: string;
  label: string;
  onCopied?: () => void;
}) {
  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!value?.trim()) return;
      navigator.clipboard?.writeText(value.trim()).then(() => onCopied?.());
    },
    [value, onCopied],
  );
  if (!value?.trim()) return null;
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copiar ${label}`}
      title={`Copiar ${label}`}
      className="p-0.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)]"
    >
      <Copy className="h-3.5 w-3.5" />
    </button>
  );
}

export function EntitiesTable({
  rows,
  loading,
  compact,
  deletingId,
  onRowClick,
  highlightId,
  onRequestDelete,
  onRequestDuplicate,
  duplicatingId = null,
  onCopySuccess,
  // Paginação
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onGoToPage,
  onNextPage,
  onPrevPage,
}: {
  rows: Array<Record<string, unknown> & { id: number; entity_type?: string; orders_count?: number }>;
  loading: boolean;
  compact?: boolean;
  deletingId: number | null;
  onRowClick?: (row: Record<string, unknown>) => void;
  highlightId?: number | string | null;
  onRequestDelete: (e: React.MouseEvent, row: Record<string, unknown>) => void;
  onRequestDuplicate?: (e: React.MouseEvent, row: Record<string, unknown>) => void;
  duplicatingId?: number | null;
  onCopySuccess?: () => void;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}) {
  const sizeCls = compact ? "text-xs" : "text-sm";
  return (
    <div className="border rounded overflow-hidden">
      <div className="overflow-auto max-h-[520px]">
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
                  className="text-center py-12 px-4"
                >
                  <div className="flex flex-col items-center gap-2 text-[var(--color-text-secondary)]">
                    <Inbox className="h-12 w-12 opacity-50" aria-hidden />
                    <p className="text-sm font-medium">
                      Nenhuma entidade encontrada
                    </p>
                    <p className="text-xs max-w-xs">
                      Clique em &quot;Adicionar&quot; para cadastrar um novo
                      cliente ou fornecedor.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const highlighted = r.id === highlightId;
              const addr = classifyAddress(r);
              const contact = classifyContact(r);
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
                      {addr === "parcial" && (
                        <span title="Endereço incompleto">
                          <AlertCircle
                            className="h-3.5 w-3.5 text-amber-500/80 shrink-0"
                            aria-label="Endereço incompleto"
                          />
                        </span>
                      )}
                      {contact === "parcial" && (
                        <span title="Contato incompleto">
                          <AlertCircle
                            className="h-3.5 w-3.5 text-amber-500/80 shrink-0"
                            aria-label="Contato incompleto"
                          />
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className="inline-flex items-center gap-1 badge badge-soft"
                      aria-label={getProfileLabel(r.entity_type)}
                      title={getProfileLabel(r.entity_type)}
                    >
                      <ProfileIcon entity_type={r.entity_type} />
                      <span>{getProfileLabel(r.entity_type)}</span>
                    </span>
                  </Td>
                  <Td>{formatDocumentDigits(r)}</Td>
                  <Td>
                    <StatusBadge status={r.document_status} />
                  </Td>
                  <Td>
                    <span className={FILL_CLASS[addr]}>
                      {addr === "completo"
                        ? "Completo"
                        : addr === "parcial"
                          ? "Parcial"
                          : "Vazio"}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1">
                      <span className={FILL_CLASS[contact]}>
                        {contact === "completo"
                          ? "Completo"
                          : contact === "parcial"
                            ? "Parcial"
                            : "Vazio"}
                      </span>
                      <CopyButton
                        value={String(r.telefone ?? "")}
                        label="telefone"
                        onCopied={onCopySuccess}
                      />
                      <CopyButton
                        value={String(r.email ?? "")}
                        label="e-mail"
                        onCopied={onCopySuccess}
                      />
                    </span>
                  </Td>
                  <Td>
                    {(r.orders_count as number) != null && (r.orders_count as number) > 0 ? (
                      <Link
                        href={`/orders?partner=${r.id}&tipo=${r.entity_type === "PF" ? "VENDA" : "COMPRA"}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        {r.orders_count} pedido{(r.orders_count as number) !== 1 ? "s" : ""}
                      </Link>
                    ) : (
                      <span className="text-[var(--color-text-secondary)]">—</span>
                    )}
                  </Td>
                  <Td>{r.ativo ? "Sim" : "Não"}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-0.5">
                      {onRequestDuplicate && (
                        <button
                          type="button"
                          aria-label="Duplicar entidade"
                          title="Duplicar"
                          disabled={duplicatingId === r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestDuplicate(e, r);
                          }}
                          className={`p-1 rounded transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed ${ACTION_BTN_HIDDEN} ${duplicatingId === r.id ? "animate-pulse !opacity-100" : ""}`}
                        >
                          <CopyPlus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Excluir"
                        onClick={(e) => onRequestDelete(e, r)}
                        disabled={deletingId === r.id}
                        className={`p-1 rounded transition-colors text-[var(--color-text-secondary)] hover:text-red-600 hover:bg-red-600/10 disabled:opacity-50 disabled:cursor-not-allowed ${ACTION_BTN_HIDDEN} ${deletingId === r.id ? "animate-pulse !opacity-100" : ""}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </span>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        onGoToPage={onGoToPage}
        onNextPage={onNextPage}
        onPrevPage={onPrevPage}
        loading={loading}
      />
    </div>
  );
}
