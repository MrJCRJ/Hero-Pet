import React from 'react';
import { buildPedidoPayloadBase } from './payload';
import { persistPedido, excluirPedido } from './serviceHelpers';
import { emitInventoryChanged } from './events';
import { MSG } from 'components/common/messages';

// Hook responsável por persistência (create/update/delete) e auto-save básico (debounced)
export function usePedidoPersistence({
  editingOrder,
  tipo,
  partnerId,
  partnerName,
  observacao,
  dataEmissao,
  dataEntrega,
  temNotaFiscal,
  parcelado,
  numeroPromissorias,
  dataPrimeiraPromissoria,
  promissoriaDatas,
  itens,
  freteTotal,
  migrarFifo,
  setCreated,
  push,
  onSaved,
  onCreated,
  setSubmitting,
  showAutoSaveToast = false,
}) {
  const isEdit = Boolean(editingOrder?.id);
  const autoSaveTimer = React.useRef(null);
  const dirtyRef = React.useRef(false);

  const buildBase = React.useCallback(() => buildPedidoPayloadBase({
    partnerId,
    partnerName,
    observacao,
    dataEmissao,
    dataEntrega,
    temNotaFiscal,
    parcelado,
    numeroPromissorias,
    dataPrimeiraPromissoria,
    promissoriaDatas,
    itens,
    freteTotal,
    tipo,
  }), [partnerId, partnerName, observacao, dataEmissao, dataEntrega, temNotaFiscal, parcelado, numeroPromissorias, dataPrimeiraPromissoria, promissoriaDatas, itens, freteTotal, tipo]);

  // Marca dirty quando campos relevantes mudam (simples)
  React.useEffect(() => { dirtyRef.current = true; }, [partnerId, partnerName, observacao, dataEmissao, dataEntrega, temNotaFiscal, parcelado, numeroPromissorias, dataPrimeiraPromissoria, promissoriaDatas, itens, freteTotal, tipo]);

  // Auto-save (apenas se já existir pedido e valorPorPromissoria definido) – pode evoluir
  React.useEffect(() => {
    if (!isEdit) return; // só para edições por enquanto
    if (!dirtyRef.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const payloadBase = buildBase();
        await persistPedido({
          isEdit: true,
          editingOrderId: editingOrder.id,
          payloadBase,
          tipo,
          partnerId,
          observacao,
          partnerName,
          dataEmissao,
          dataEntrega,
          temNotaFiscal,
          parcelado,
          numeroPromissorias,
          dataPrimeiraPromissoria,
          migrarFifo,
        });
        dirtyRef.current = false;
        if (showAutoSaveToast && push) {
          push('Alterações salvas automaticamente', { type: 'info' });
        }
      } catch (_) {
        // silencioso por enquanto; futura surface de erros de autosave
      }
    }, 2000); // debounce 2s
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [isEdit, buildBase, editingOrder, tipo, partnerId, observacao, partnerName, dataEmissao, dataEntrega, temNotaFiscal, parcelado, numeroPromissorias, dataPrimeiraPromissoria, migrarFifo, showAutoSaveToast, push]);

  async function handleSubmit(canSubmit) {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payloadBase = buildBase();
      const result = await persistPedido({
        isEdit,
        editingOrderId: editingOrder?.id,
        payloadBase,
        tipo,
        partnerId,
        observacao,
        partnerName,
        dataEmissao,
        dataEntrega,
        temNotaFiscal,
        parcelado,
        numeroPromissorias,
        dataPrimeiraPromissoria,
        migrarFifo,
      });
      if (isEdit) {
        onSaved && onSaved({ id: editingOrder.id });
        setCreated({ id: editingOrder.id, status: editingOrder.status });
        emitInventoryChanged({ productIds: itens.map(it => Number(it.produto_id)).filter(v => Number.isFinite(v)), source: 'order-put', orderId: editingOrder.id });
        push(`${MSG.PEDIDO_UPDATED} #${editingOrder.id}`, { type: 'success' });
      } else {
        setCreated({ ...result, status: result.status || 'confirmado' });
        onCreated && onCreated(result);
        emitInventoryChanged({ productIds: itens.map(it => Number(it.produto_id)).filter(v => Number.isFinite(v)), source: 'order-post', orderId: result.id });
        push(`${MSG.PEDIDO_CREATED} #${result.id}`, { type: 'success' });
      }
    } catch (err) {
      push(err.message, { type: 'error', assertive: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingOrder?.id) return;
    const ok = window.confirm(`Excluir pedido #${editingOrder.id}? Esta ação remove movimentos e itens relacionados.`);
    if (!ok) return;
    try {
      setSubmitting(true);
      await excluirPedido(editingOrder.id);
      onSaved && onSaved({ id: editingOrder.id, deleted: true });
      push(`${MSG.PEDIDO_DELETED} #${editingOrder.id}`, { type: 'success' });
    } catch (err) {
      push(err.message, { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return {
    handleSubmit,
    handleDelete,
  };
}
