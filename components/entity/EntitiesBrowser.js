import React from 'react';
import { Button } from 'components/ui/Button';
import { usePaginatedEntities } from 'hooks/usePaginatedEntities';
import { formatCpfCnpj } from './utils';

/**
 * Componente de listagem e filtros de Entities reutilizável.
 * Props:
 * - limit: número de registros por página (default 20)
 * - compact: reduz tipografia/padding (para uso inline no dashboard)
 */
export function EntitiesBrowser({ limit = 20, compact = false }) {
  const {
    rows, total, summary,
    loading, loadingMore, error,
    statusFilter, pendingOnly, canLoadMore,
    setStatusFilter, setPendingOnly, loadMore
  } = usePaginatedEntities({ limit });

  const textSize = compact ? 'text-xs' : 'text-sm';
  // tableText removido (não utilizado após ajustes de design)

  return (
    <div className={`space-y-4 ${textSize}`}>
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div className="space-y-2">
          <h2 className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`}>Entidades Cadastradas</h2>
          <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-500`}>Filtros não bloqueiam uso de outras ações.</p>
          {summary && (
            <div className="flex gap-2 flex-wrap text-[10px]">
              <Badge label="Total" value={summary.total} />
              {Object.entries(summary.by_status || {}).map(([k, v]) => (
                <Badge key={k} label={`Status:${k}`} value={v} />
              ))}
              {Object.entries(summary.by_pending || {}).map(([k, v]) => (
                <Badge key={k} label={`Pending:${k}`} value={v} />
              ))}
            </div>
          )}
        </div>
        <Filters
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          pendingOnly={pendingOnly}
          onPendingChange={setPendingOnly}
          loading={loading}
          compact={compact}
        />
      </div>
      {error && (
        <div className="text-red-600 text-xs border border-red-300 bg-red-50 px-3 py-2 rounded">{error}</div>
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

function Filters({ statusFilter, onStatusChange, pendingOnly, onPendingChange, loading }) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col">
        <label htmlFor="entities-status-filter" className="text-[10px] font-medium mb-1">Status</label>
        <select
          id="entities-status-filter"
          disabled={loading}
          className="border rounded px-2 py-1 text-[10px]"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">(todos)</option>
          <option value="pending">pending</option>
          <option value="provisional">provisional</option>
          <option value="valid">valid</option>
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
        <span className="text-[10px] text-gray-500 animate-pulse">Carregando...</span>
      )}
    </div>
  );
}

function Table({ rows, loading, total, onLoadMore, canLoadMore, loadingMore, compact }) {
  const sizeCls = compact ? 'text-xs' : 'text-sm';
  return (
    <div className="border rounded overflow-x-auto">
      <table className={`min-w-full ${sizeCls}`}>
        <thead className="bg-gray-100">
          <tr>
            <Th>Nome</Th>
            <Th>Tipo</Th>
            <Th>Documento</Th>
            <Th>Status</Th>
            <Th>Pending?</Th>
            <Th>Criado</Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan={6} className="text-center py-6 text-gray-500">Nenhum registro encontrado</td>
            </tr>
          )}
          {rows.map(r => (
            <tr key={r.id} className="border-t hover:bg-gray-50">
              <Td>{r.name}</Td>
              <Td>{r.entity_type}</Td>
              <Td>{r.document_digits ? formatCpfCnpj(r.document_digits) : (r.document_pending ? '(pendente)' : '—')}</Td>
              <Td><StatusBadge status={r.document_status} /></Td>
              <Td>{r.document_pending ? 'Sim' : 'Não'}</Td>
              <Td>{new Date(r.created_at).toLocaleDateString()}</Td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50 text-[10px] text-gray-600">
            <td colSpan={6} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span>Total exibido: {rows.length} / Total filtrado: {total}</span>
                <div className="flex items-center gap-2">
                  {loading && (<span className="text-[10px] text-gray-500 animate-pulse">Carregando...</span>)}
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
                    <span className="text-[10px] text-gray-500">Fim dos resultados</span>
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

function Th({ children }) { return <th className="text-left px-3 py-2 font-medium">{children}</th>; }
function Td({ children }) { return <td className="px-3 py-2 whitespace-nowrap align-top">{children}</td>; }

function StatusBadge({ status }) {
  const map = { valid: 'badge badge-success', pending: 'badge badge-warning', provisional: 'badge badge-info' };
  const cls = map[status] || 'badge';
  return <span className={cls}>{status}</span>;
}
function Badge({ label, value }) { return <span className="badge badge-soft"><strong className="mr-1">{label}:</strong> {value}</span>; }
