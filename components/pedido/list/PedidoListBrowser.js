import React from 'react';
import { ConfirmDialog } from 'components/common/ConfirmDialog';
import { useToast } from 'components/entities/shared/toast';
import { deleteOrder as deleteOrderService } from 'components/pedido/service';
import FilterBar from 'components/orders/FilterBar';
import { usePedidos } from 'components/orders/shared/hooks';
import PedidoListRow from './PedidoListRow';
import PedidoListHeader from './PedidoListHeader';

export function PedidoListBrowser({ limit = 20, refreshTick = 0, onEdit }) {
  const [filters, setFilters] = React.useState({ tipo: '', q: '', from: '', to: '' });
  const { loading, data, reload, page, hasMore, nextPage, prevPage, total, limit: effLimit } = usePedidos(filters, limit);
  const tableContainerRef = React.useRef(null);
  const { push } = useToast();

  React.useEffect(() => { reload(); }, [refreshTick, reload]);

  React.useEffect(() => {
    if (tableContainerRef.current) tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, data]);

  const [confirmingOrder, setConfirmingOrder] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  const requestDelete = (p, e) => { e?.stopPropagation?.(); setConfirmingOrder(p); };

  const performDelete = async () => {
    if (!confirmingOrder) return;
    try {
      setDeleting(true);
      await deleteOrderService(confirmingOrder.id);
      push(`Pedido #${confirmingOrder.id} excluído.`, { type: 'success' });
      setConfirmingOrder(null);
      await reload();
    } catch (e) {
      push(e.message || 'Falha ao excluir pedido', { type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="text-sm">
      <FilterBar filters={filters} onChange={setFilters} onReload={reload} />
      <div ref={tableContainerRef} className="overflow-auto border rounded text-xs max-h-[520px]">
        <table className="min-w-full text-xs">
          <PedidoListHeader />
          <tbody>
            {data.map(p => (
              <PedidoListRow key={p.id} p={p} onEdit={onEdit} reload={reload} onDelete={(e) => requestDelete(p, e)} />
            ))}
            {!loading && data.length === 0 && (
              <tr><td className="px-3 py-6 text-center opacity-70" colSpan={8}>Nenhum pedido encontrado</td></tr>
            )}
            {loading && (
              <tr><td className="px-3 py-6 text-center opacity-70" colSpan={8}>Carregando...</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between mt-2 text-xs gap-3">
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] disabled:opacity-40" onClick={prevPage} disabled={page === 0 || loading}>Anterior</button>
          <button className="px-2 py-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] disabled:opacity-40" onClick={nextPage} disabled={!hasMore || loading}>Próxima</button>
        </div>
        <div className="opacity-70 flex items-center gap-2">
          <span>Página {page + 1}</span>
          {typeof total === 'number' && total >= 0 && (
            <span className="whitespace-nowrap">
              {total === 0 ? 'Nenhum registro' : `Mostrando ${page * effLimit + 1}–${Math.min((page + 1) * effLimit, total)} de ${total}`}
            </span>
          )}
        </div>
      </div>
      {confirmingOrder && (
        <ConfirmDialog
          title={`Excluir Pedido #${confirmingOrder.id}`}
          message={`Tem certeza que deseja excluir o pedido #${confirmingOrder.id}?\n\nEsta ação também remove itens, movimentos de estoque e parcelas associadas. Não pode ser desfeita.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          danger
          loading={deleting}
          onCancel={() => !deleting && setConfirmingOrder(null)}
          onConfirm={performDelete}
        />
      )}
    </div>
  );
}
