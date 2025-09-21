import React, { useMemo, useState, useCallback } from "react";
import { useToast } from "../entities/shared/toast";
import { useItemDiff } from "./useItemDiff";
import { numOrNull, mapEditingOrderToItems, defaultEmptyItem, computeItemTotal as computeItemTotalPure } from "./utils";
import { updateOrder as updateOrderService, createOrder as createOrderService, deleteOrder as deleteOrderService } from "./service";
import { useSaldoSync, usePedidoFetchers } from "./hooks";
import { emitInventoryChanged } from "./events";

export function usePedidoFormController({ onCreated, onSaved, editingOrder }) {
  const { push } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [tipo, setTipo] = useState("VENDA");
  const [originalTipo, setOriginalTipo] = useState("VENDA");
  const [partnerId, setPartnerId] = useState("");
  const [partnerLabel, setPartnerLabel] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [observacao, setObservacao] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [temNotaFiscal, setTemNotaFiscal] = useState(false);
  const [parcelado, setParcelado] = useState(false);
  const [itens, setItens] = useState([
    { produto_id: "", produto_label: "", quantidade: "", preco_unitario: "", desconto_unitario: "", produto_saldo: null },
  ]);
  const [originalItens, setOriginalItens] = useState([]);
  const [created, setCreated] = useState(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [productModalIndex, setProductModalIndex] = useState(null);
  const [showTypeChangeModal, setShowTypeChangeModal] = useState(false);
  const [pendingTipo, setPendingTipo] = useState("");

  // Promissórias
  const [numeroPromissorias, setNumeroPromissorias] = useState(1);
  const [dataPrimeiraPromissoria, setDataPrimeiraPromissoria] = useState("");
  const [valorPorPromissoria, setValorPorPromissoria] = useState(0);

  // Diff de itens
  const { getItemChanges, getItemDiffClass, getItemDiffIcon } = useItemDiff(itens, originalItens, editingOrder);

  // Preenche estado ao editar
  React.useEffect(() => {
    if (!editingOrder) return;
    const tipoOriginal = editingOrder.tipo || "VENDA";
    setTipo(tipoOriginal);
    setOriginalTipo(tipoOriginal);
    setPartnerId(String(editingOrder.partner_entity_id || ""));
    setPartnerLabel(editingOrder.partner_name || "");
    setPartnerName(editingOrder.partner_name || "");
    setDataEmissao(editingOrder.data_emissao ? String(editingOrder.data_emissao).slice(0, 10) : "");
    setObservacao(editingOrder.observacao || "");
    setDataEntrega(editingOrder.data_entrega ? new Date(editingOrder.data_entrega).toISOString().slice(0, 10) : "");
    setTemNotaFiscal(Boolean(editingOrder.tem_nota_fiscal));
    setParcelado(Boolean(editingOrder.parcelado));
    const nProm = Number(editingOrder.numero_promissorias || 0);
    setNumeroPromissorias(Number.isFinite(nProm) && nProm > 0 ? nProm : 1);
    setDataPrimeiraPromissoria(editingOrder.data_primeira_promissoria ? String(editingOrder.data_primeira_promissoria).slice(0, 10) : "");
    setValorPorPromissoria(Number(editingOrder.valor_por_promissoria || 0));
    const mapped = mapEditingOrderToItems(editingOrder);
    const itensFinais = mapped.length ? mapped : [defaultEmptyItem()];
    setItens(itensFinais);
    setOriginalItens(mapped);
    setCreated({ id: editingOrder.id, status: editingOrder.status });
  }, [editingOrder]);

  const canSubmit = useMemo(() => {
    if (!tipo) return false;
    const pid = Number(partnerId);
    if (!Number.isFinite(pid)) return false;
    const atLeastOne = itens.some(
      (it) => Number.isFinite(Number(it.produto_id)) && Number(it.quantidade) > 0,
    );
    return atLeastOne;
  }, [tipo, partnerId, itens]);

  const updateItem = useCallback((idx, patch) => {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }, []);
  const addItem = useCallback(() => {
    setItens((prev) => [
      ...prev,
      defaultEmptyItem(),
    ]);
  }, []);
  const removeItem = useCallback((idx) => {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }, []);
  const clearForm = useCallback(() => {
    setTipo("VENDA");
    setPartnerId("");
    setPartnerLabel("");
    setPartnerName("");
    setObservacao("");
    setDataEntrega("");
    setTemNotaFiscal(false);
    setParcelado(false);
    setItens([defaultEmptyItem()]);
    setCreated(null);
  }, []);

  // Saldo para VENDA
  useSaldoSync({ tipo, itens, setItens });

  // Helpers de UI
  const computeItemTotal = useCallback((it) => computeItemTotalPure(it), []);

  const computeOrderTotalEstimate = useCallback(() => {
    const sum = itens.reduce((acc, it) => {
      const t = computeItemTotal(it);
      return acc + (Number.isFinite(Number(t)) ? Number(t) : 0);
    }, 0);
    return Number(sum.toFixed(2));
  }, [itens, computeItemTotal]);

  // Atualiza valor por promissória quando total muda
  React.useEffect(() => {
    const total = computeOrderTotalEstimate();
    if (numeroPromissorias > 0) {
      setValorPorPromissoria(Number((total / numeroPromissorias).toFixed(2)));
    }
  }, [itens, numeroPromissorias, computeOrderTotalEstimate]);

  // Fetch helpers
  const { fetchEntities, fetchProdutos } = usePedidoFetchers({ tipo, partnerId });

  // Builders de payload
  const buildPayloadBase = useCallback(() => ({
    partner_entity_id: Number(partnerId),
    partner_name: partnerName || null,
    observacao: observacao || null,
    data_emissao: dataEmissao || null,
    data_entrega: dataEntrega || null,
    tem_nota_fiscal: temNotaFiscal,
    parcelado: parcelado,
    numero_promissorias: Number(numeroPromissorias) || 1,
    data_primeira_promissoria: dataPrimeiraPromissoria || null,
    itens: itens
      .filter((it) => Number.isFinite(Number(it.produto_id)) && Number(it.quantidade) > 0)
      .map((it) => ({
        produto_id: Number(it.produto_id),
        quantidade: Number(it.quantidade),
        ...(numOrNull(it.preco_unitario) != null ? { preco_unitario: numOrNull(it.preco_unitario) } : {}),
        ...(numOrNull(it.desconto_unitario) != null ? { desconto_unitario: numOrNull(it.desconto_unitario) } : {}),
      })),
  }), [partnerId, partnerName, observacao, dataEmissao, dataEntrega, temNotaFiscal, parcelado, numeroPromissorias, dataPrimeiraPromissoria, itens]);

  const updateOrder = useCallback(async (orderId, payloadBase) => {
    const body = {
      tipo,
      partner_entity_id: Number(partnerId),
      observacao: observacao || null,
      partner_name: partnerName || null,
      data_emissao: dataEmissao || null,
      data_entrega: dataEntrega || null,
      tem_nota_fiscal: temNotaFiscal,
      parcelado: parcelado,
      numero_promissorias: Number(numeroPromissorias) || 1,
      data_primeira_promissoria: dataPrimeiraPromissoria || null,
      itens: payloadBase.itens,
    };
    return updateOrderService(editingOrder?.id ?? orderId, body);
  }, [tipo, partnerId, observacao, partnerName, dataEmissao, dataEntrega, temNotaFiscal, parcelado, numeroPromissorias, dataPrimeiraPromissoria, editingOrder?.id]);

  const createOrder = useCallback(async (payloadBase) => {
    const payload = { tipo, ...payloadBase };
    return createOrderService(payload);
  }, [tipo]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payloadBase = buildPayloadBase();

      if (editingOrder?.id) {
        await updateOrder(editingOrder.id, payloadBase);
        if (typeof onSaved === "function") {
          try { onSaved({ id: editingOrder.id }); } catch (_) { /* noop */ }
        }
        setCreated({ id: editingOrder.id, status: editingOrder.status });
        emitInventoryChanged({ productIds: itens.map((it) => Number(it.produto_id)).filter((v) => Number.isFinite(v)), source: 'order-put', orderId: editingOrder.id });
        push(`Pedido #${editingOrder.id} atualizado.`, { type: "success" });
      } else {
        const data = await createOrder(payloadBase);
        setCreated({ ...data, status: data.status || "confirmado" });
        if (typeof onCreated === "function") {
          try { onCreated(data); } catch (_) { /* noop */ }
        }
        emitInventoryChanged({ productIds: itens.map((it) => Number(it.produto_id)).filter((v) => Number.isFinite(v)), source: 'order-post', orderId: data.id });
        push(`Pedido #${data.id} criado.`, { type: "success" });
      }
    } catch (err) {
      push(err.message, { type: "error" });
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
      await deleteOrderService(editingOrder.id);
      if (typeof onSaved === 'function') {
        try { onSaved({ id: editingOrder.id, deleted: true }); } catch (_) { /* noop */ }
      }
      push(`Pedido #${editingOrder.id} excluído.`, { type: 'success' });
    } catch (err) {
      push(err.message, { type: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // Tipo
  function handleTipoChange(novoTipo) {
    if (!editingOrder || novoTipo === originalTipo) {
      setTipo(novoTipo);
      return;
    }
    setPendingTipo(novoTipo);
    setShowTypeChangeModal(true);
  }
  function confirmTipoChange() {
    setTipo(pendingTipo);
    setShowTypeChangeModal(false);
    setPendingTipo("");
    setPartnerId("");
    setPartnerLabel("");
    setPartnerName("");
  }
  function cancelTipoChange() {
    setShowTypeChangeModal(false);
    setPendingTipo("");
  }

  // SelectionModal (produtos)
  // (sem manipulador dedicado de seleção de produto aqui; a view trata e chama fetchSaldo quando necessário)

  return {
    // estado geral
    submitting, canSubmit, created, clearForm,
    // tipo e parceiro
    tipo, handleTipoChange, originalTipo, pendingTipo, confirmTipoChange, cancelTipoChange, showTypeChangeModal,
    partnerId, partnerLabel, partnerName, setPartnerId, setPartnerLabel, setPartnerName,
    showPartnerModal, setShowPartnerModal,
    // datas e flags
    dataEmissao, setDataEmissao, dataEntrega, setDataEntrega, observacao, setObservacao,
    temNotaFiscal, setTemNotaFiscal, parcelado, setParcelado,
    // itens
    itens, setItens, updateItem, addItem, removeItem, originalItens,
    getItemChanges, getItemDiffClass, getItemDiffIcon,
    productModalIndex, setProductModalIndex,
    // promissórias
    numeroPromissorias, setNumeroPromissorias, dataPrimeiraPromissoria, setDataPrimeiraPromissoria, valorPorPromissoria,
    // helpers
    computeItemTotal, computeOrderTotalEstimate,
    // fetchers
    fetchEntities, fetchProdutos,
    // ações
    handleSubmit, handleDelete,
  };
}
