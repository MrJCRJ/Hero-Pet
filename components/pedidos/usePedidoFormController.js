import React, { useMemo, useState, useCallback } from "react";
import { useToast } from "../entities/shared/toast";
import { usePedidoItems } from './usePedidoItems';
import { usePedidoPromissorias } from './usePedidoPromissorias';
import { usePedidoTotals } from './usePedidoTotals';
import { usePedidoTipoParceiro } from './usePedidoTipoParceiro';
import { usePedidoSideEffects } from './usePedidoSideEffects';
import { defaultEmptyItem } from "./utils";
// MSG agora utilizado apenas dentro do hook de persistência
import { usePedidoFetchers } from "./hooks";
import { usePedidoPersistence } from './usePedidoPersistence';

export function usePedidoFormController({ onCreated, onSaved, editingOrder }) {
  const { push } = useToast();
  // FIFO flags
  const [fifoAplicado, setFifoAplicado] = useState(() => {
    if (editingOrder) {
      if (typeof editingOrder.fifo_aplicado === 'boolean') return editingOrder.fifo_aplicado;
      return true;
    }
    return true;
  });
  const [migrarFifo, setMigrarFifo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Tipo & Parceiro
  const {
    tipo,
    setTipo,
    originalTipo,
    partnerId,
    partnerLabel,
    partnerName,
    setPartnerId,
    setPartnerLabel,
    setPartnerName,
    showTypeChangeModal,
    pendingTipo,
    handleTipoChange,
    confirmTipoChange,
    cancelTipoChange,
  } = usePedidoTipoParceiro(editingOrder);

  // Campos básicos
  const [observacao, setObservacao] = useState(() => editingOrder?.observacao || "");
  const [dataEmissao, setDataEmissao] = useState(() => editingOrder?.data_emissao ? String(editingOrder.data_emissao).slice(0, 10) : "");
  const [dataEntrega, setDataEntrega] = useState(() => editingOrder?.data_entrega ? new Date(editingOrder.data_entrega).toISOString().slice(0, 10) : "");
  const [temNotaFiscal, setTemNotaFiscal] = useState(() => editingOrder ? Boolean(editingOrder.tem_nota_fiscal) : true);
  const [parcelado, setParcelado] = useState(() => (editingOrder?.parcelado != null ? Boolean(editingOrder.parcelado) : true));

  // Itens
  const { itens, setItens, originalItens, updateItem, addItem, removeItem, computeItemTotal: computeItemTotalFromHook, getItemChanges, getItemDiffClass, getItemDiffIcon } = usePedidoItems(editingOrder);

  // Promissórias
  const { numeroPromissorias, setNumeroPromissorias, dataPrimeiraPromissoria, setDataPrimeiraPromissoria, valorPorPromissoria, setValorPorPromissoria, frequenciaPromissorias, setFrequenciaPromissorias, intervaloDiasPromissorias, setIntervaloDiasPromissorias, promissoriaDatas, setPromissoriaDatas, promissoriasMeta, sumPromissorias, computePromissoriasMismatch } = usePedidoPromissorias(editingOrder);

  // Frete & Totais
  const [freteTotal, setFreteTotal] = useState("");
  const itensRef = React.useRef(itens); React.useEffect(() => { itensRef.current = itens; }, [itens]);
  const tipoRef = React.useRef(tipo); React.useEffect(() => { tipoRef.current = tipo; }, [tipo]);
  const numeroPromissoriasRef = React.useRef(numeroPromissorias); React.useEffect(() => { numeroPromissoriasRef.current = numeroPromissorias; }, [numeroPromissorias]);
  const freteRef = React.useRef(""); React.useEffect(() => { freteRef.current = freteTotal; }, [freteTotal]);
  const { computeOrderTotalEstimate, computeLucroBruto, computeLucroPercent, subtotal, totalDescontos, totalLiquido } = usePedidoTotals({ itensRef, tipoRef, numeroPromissoriasRef, setValorPorPromissoria, freteRef });

  // Created record (após POST/PUT)
  const [created, setCreated] = useState(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [productModalIndex, setProductModalIndex] = useState(null);

  // Efeitos colaterais centralizados (temNotaFiscal + saldo sync)
  usePedidoSideEffects({ tipo, itens, setItens, setTemNotaFiscal });

  // Preenche campos suplementares quando editingOrder muda
  React.useEffect(() => {
    if (!editingOrder) return;
    setObservacao(editingOrder.observacao || "");
    setDataEmissao(editingOrder.data_emissao ? String(editingOrder.data_emissao).slice(0, 10) : "");
    setDataEntrega(editingOrder.data_entrega ? new Date(editingOrder.data_entrega).toISOString().slice(0, 10) : "");
    setTemNotaFiscal(Boolean(editingOrder.tem_nota_fiscal));
    setParcelado(Boolean(editingOrder.parcelado));
    setCreated({ id: editingOrder.id, status: editingOrder.status });
    setFifoAplicado(Boolean(editingOrder.fifo_aplicado));
    setMigrarFifo(false);
    if (Object.prototype.hasOwnProperty.call(editingOrder, 'frete_total')) {
      setFreteTotal(editingOrder.frete_total != null ? String(editingOrder.frete_total) : "");
    } else {
      setFreteTotal("");
    }
  }, [editingOrder]);

  // Validação básica para habilitar submit
  const canSubmit = useMemo(() => {
    if (!tipo) return false;
    const pid = Number(partnerId);
    if (!Number.isFinite(pid)) return false;
    return itens.some(it => Number.isFinite(Number(it.produto_id)) && Number(it.quantidade) > 0);
  }, [tipo, partnerId, itens]);

  // Limpeza do formulário
  const clearForm = useCallback(() => {
    setTipo('VENDA');
    setPartnerId('');
    setPartnerLabel('');
    setPartnerName('');
    setObservacao('');
    setDataEntrega('');
    setTemNotaFiscal(false);
    setParcelado(true);
    setItens([defaultEmptyItem()]);
    setCreated(null);
    setFreteTotal('');
  }, [setTipo, setPartnerId, setPartnerLabel, setPartnerName, setItens]);

  // Helpers
  const computeItemTotal = computeItemTotalFromHook; // mantém API anterior

  // Fetch helpers
  const { fetchEntities, fetchProdutos } = usePedidoFetchers({ tipo, partnerId });


  // Persistência unificada
  const { handleSubmit, handleDelete } = usePedidoPersistence({
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
  });

  return {
    // estado geral
    submitting,
    canSubmit,
    created,
    clearForm,
    // tipo e parceiro
    tipo,
    handleTipoChange,
    originalTipo,
    pendingTipo,
    confirmTipoChange,
    cancelTipoChange,
    showTypeChangeModal,
    partnerId,
    partnerLabel,
    partnerName,
    setPartnerId,
    setPartnerLabel,
    setPartnerName,
    showPartnerModal,
    setShowPartnerModal,
    // datas e flags
    dataEmissao,
    setDataEmissao,
    dataEntrega,
    setDataEntrega,
    observacao,
    setObservacao,
    temNotaFiscal,
    setTemNotaFiscal,
    parcelado,
    setParcelado,
    // itens
    itens,
    setItens,
    updateItem,
    addItem,
    removeItem,
    originalItens,
    getItemChanges,
    getItemDiffClass,
    getItemDiffIcon,
    productModalIndex,
    setProductModalIndex,
    // promissórias
    numeroPromissorias,
    setNumeroPromissorias,
    dataPrimeiraPromissoria,
    setDataPrimeiraPromissoria,
    valorPorPromissoria,
    frequenciaPromissorias,
    setFrequenciaPromissorias,
    intervaloDiasPromissorias,
    setIntervaloDiasPromissorias,
    promissoriaDatas,
    setPromissoriaDatas,
    promissoriasMeta,
    sumPromissorias,
    promissoriasMismatch: computePromissoriasMismatch(totalLiquido).mismatch,
    promissoriasDiferenca: computePromissoriasMismatch(totalLiquido).diff,
    // helpers
    computeItemTotal,
    computeOrderTotalEstimate,
    subtotal,
    totalDescontos,
    totalLiquido,
    computeLucroBruto,
    computeLucroPercent,
    // fetchers
    fetchEntities,
    fetchProdutos,
    // ações
    handleSubmit,
    handleDelete,
    // frete total
    freteTotal,
    setFreteTotal,
    // fifo
    fifoAplicado,
    migrarFifo,
    setMigrarFifo,
    editingOrder,
  };
}
