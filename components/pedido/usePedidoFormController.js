import React, { useMemo, useState, useCallback } from "react";
import { useToast } from "../entities/shared/toast";
// import { useItemDiff } from "./useItemDiff"; // legado (remoção futura)
import { usePedidoItems } from './usePedidoItems';
import { usePedidoPromissorias } from './usePedidoPromissorias';
import { usePedidoTotals } from './usePedidoTotals';
import { numOrNull, mapEditingOrderToItems, defaultEmptyItem } from "./utils";
import { MSG } from "components/common/messages";
import {
  updateOrder as updateOrderService,
  createOrder as createOrderService,
  deleteOrder as deleteOrderService,
} from "./service";
import { useSaldoSync, usePedidoFetchers } from "./hooks";
import { emitInventoryChanged } from "./events";

export function usePedidoFormController({ onCreated, onSaved, editingOrder }) {
  const { push } = useToast();
  // FIFO legacy / migração
  const [fifoAplicado, setFifoAplicado] = useState(() => {
    if (editingOrder) {
      if (typeof editingOrder.fifo_aplicado === "boolean")
        return editingOrder.fifo_aplicado;
      return true;
    }
    return true;
  });
  const [migrarFifo, setMigrarFifo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tipo, setTipo] = useState(() => editingOrder?.tipo || "VENDA");
  const [originalTipo, setOriginalTipo] = useState(
    () => editingOrder?.tipo || "VENDA",
  );
  const [partnerId, setPartnerId] = useState(() =>
    String(editingOrder?.partner_entity_id || ""),
  );
  const [partnerLabel, setPartnerLabel] = useState(
    () => editingOrder?.partner_name || "",
  );
  const [partnerName, setPartnerName] = useState(
    () => editingOrder?.partner_name || "",
  );
  const [observacao, setObservacao] = useState(
    () => editingOrder?.observacao || "",
  );
  const [dataEmissao, setDataEmissao] = useState(() =>
    editingOrder?.data_emissao
      ? String(editingOrder.data_emissao).slice(0, 10)
      : "",
  );
  const [dataEntrega, setDataEntrega] = useState(() =>
    editingOrder?.data_entrega
      ? new Date(editingOrder.data_entrega).toISOString().slice(0, 10)
      : "",
  );
  const [temNotaFiscal, setTemNotaFiscal] = useState(() =>
    editingOrder ? Boolean(editingOrder.tem_nota_fiscal) : true,
  );
  const [parcelado, setParcelado] = useState(() =>
    editingOrder?.parcelado != null ? Boolean(editingOrder.parcelado) : true,
  );
  // Itens extraídos para hook dedicado (fase 1 de refatoração)
  const {
    itens,
    setItens,
    originalItens,
    updateItem,
    addItem,
    removeItem,
    computeItemTotal: computeItemTotalFromHook,
    getItemChanges,
    getItemDiffClass,
    getItemDiffIcon,
  } = usePedidoItems(editingOrder);
  const [freteTotal, setFreteTotal] = useState("");
  const [created, setCreated] = useState(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [productModalIndex, setProductModalIndex] = useState(null);
  const [showTypeChangeModal, setShowTypeChangeModal] = useState(false);
  const [pendingTipo, setPendingTipo] = useState("");

  // Promissórias (hook extraído)
  const {
    numeroPromissorias,
    setNumeroPromissorias,
    dataPrimeiraPromissoria,
    setDataPrimeiraPromissoria,
    valorPorPromissoria,
    setValorPorPromissoria,
    frequenciaPromissorias,
    setFrequenciaPromissorias,
    intervaloDiasPromissorias,
    setIntervaloDiasPromissorias,
    promissoriaDatas,
    setPromissoriaDatas,
    promissoriasMeta,
  } = usePedidoPromissorias(editingOrder);

  // Totais & lucro (hook extraído) - usando refs para evitar recriação de callbacks
  const itensRef = React.useRef(itens);
  React.useEffect(() => { itensRef.current = itens; }, [itens]);
  const tipoRef = React.useRef(tipo);
  React.useEffect(() => { tipoRef.current = tipo; }, [tipo]);
  const numeroPromissoriasRef = React.useRef(numeroPromissorias);
  React.useEffect(() => { numeroPromissoriasRef.current = numeroPromissorias; }, [numeroPromissorias]);
  const { computeOrderTotalEstimate: computeOrderTotalItemsOnly, computeLucroBruto } = usePedidoTotals({
    itensRef,
    tipoRef,
    numeroPromissoriasRef,
    setValorPorPromissoria,
  });

  // Diff de itens
  // Diferenças agora fornecidas por usePedidoItems

  // Preenche estado ao editar
  React.useEffect(() => {
    if (!editingOrder) return;
    const tipoOriginal = editingOrder.tipo || "VENDA";
    setTipo(tipoOriginal);
    setOriginalTipo(tipoOriginal);
    setPartnerId(String(editingOrder.partner_entity_id || ""));
    setPartnerLabel(editingOrder.partner_name || "");
    setPartnerName(editingOrder.partner_name || "");
    setDataEmissao(
      editingOrder.data_emissao
        ? String(editingOrder.data_emissao).slice(0, 10)
        : "",
    );
    setObservacao(editingOrder.observacao || "");
    setDataEntrega(
      editingOrder.data_entrega
        ? new Date(editingOrder.data_entrega).toISOString().slice(0, 10)
        : "",
    );
    setTemNotaFiscal(Boolean(editingOrder.tem_nota_fiscal));
    setParcelado(Boolean(editingOrder.parcelado));
    // promissórias inicializadas pelo hook usePedidoPromissorias
    const mapped = mapEditingOrderToItems(editingOrder);
    const itensFinais = mapped.length ? mapped : [defaultEmptyItem()];
    setItens(itensFinais);
    // originalItens agora gerenciado em hook extraído (usePedidoItems)
    setCreated({ id: editingOrder.id, status: editingOrder.status });
    setFifoAplicado(Boolean(editingOrder.fifo_aplicado));
    setMigrarFifo(false);

    // Hidratar frete_total ao editar (apenas armazena string; exibição/uso condicionado a tipo === "COMPRA")
    if (Object.prototype.hasOwnProperty.call(editingOrder, "frete_total")) {
      setFreteTotal(
        editingOrder.frete_total != null
          ? String(editingOrder.frete_total)
          : "",
      );
    } else {
      setFreteTotal("");
    }

    // Hidratar cronograma se vier do GET /pedidos/:id
    // cronograma & meta tratados no hook
  }, [editingOrder, setItens]);

  const canSubmit = useMemo(() => {
    if (!tipo) return false;
    const pid = Number(partnerId);
    if (!Number.isFinite(pid)) return false;
    const atLeastOne = itens.some(
      (it) =>
        Number.isFinite(Number(it.produto_id)) && Number(it.quantidade) > 0,
    );
    return atLeastOne;
  }, [tipo, partnerId, itens]);

  const clearForm = useCallback(() => {
    setTipo("VENDA");
    setPartnerId("");
    setPartnerLabel("");
    setPartnerName("");
    setObservacao("");
    setDataEntrega("");
    setTemNotaFiscal(false);
    // Sistema de promissórias sempre ativo por padrão
    setParcelado(true);
    setItens([defaultEmptyItem()]); // hook mantém originalItens interno
    setCreated(null);
    setFreteTotal("");
  }, [setItens]);

  // Forçar temNotaFiscal=true para VENDA (não exibido na UI)
  React.useEffect(() => {
    // Política: VENDA => sempre true; COMPRA => false (não exibido na UI)
    setTemNotaFiscal(tipo === "VENDA");
  }, [tipo]);

  // Saldo para VENDA
  useSaldoSync({ tipo, itens, setItens });

  // Helpers de UI (usar computeItemTotal original do hook de itens para manter consistência visual)
  const computeItemTotal = computeItemTotalFromHook;
  // Somatório incluindo frete quando COMPRA
  const computeOrderTotalEstimate = useCallback(() => {
    const baseTotal = computeOrderTotalItemsOnly();
    const freteVal = tipo === 'COMPRA' ? Number(freteTotal || 0) : 0;
    return Number((baseTotal + (Number.isFinite(freteVal) ? freteVal : 0)).toFixed(2));
  }, [computeOrderTotalItemsOnly, tipo, freteTotal]);

  // Fetch helpers
  const { fetchEntities, fetchProdutos } = usePedidoFetchers({
    tipo,
    partnerId,
  });

  // Builders de payload
  const buildPayloadBase = useCallback(
    () => ({
      partner_entity_id: Number(partnerId),
      partner_name: partnerName || null,
      observacao: observacao || null,
      data_emissao: dataEmissao || null,
      data_entrega: dataEntrega || null,
      tem_nota_fiscal: temNotaFiscal,
      parcelado: parcelado,
      numero_promissorias: Number(numeroPromissorias) || 1,
      data_primeira_promissoria: dataPrimeiraPromissoria || null,
      // Enviar cronograma explícito quando existir (manual ou gerado)
      promissoria_datas: Array.isArray(promissoriaDatas)
        ? promissoriaDatas
          .filter(
            (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s),
          )
          .slice(0, Math.max(0, Number(numeroPromissorias) || 0))
        : [],
      itens: itens
        .filter(
          (it) =>
            Number.isFinite(Number(it.produto_id)) && Number(it.quantidade) > 0,
        )
        .map((it) => ({
          produto_id: Number(it.produto_id),
          quantidade: Number(it.quantidade),
          ...(numOrNull(it.preco_unitario) != null
            ? { preco_unitario: numOrNull(it.preco_unitario) }
            : {}),
          ...(numOrNull(it.desconto_unitario) != null
            ? { desconto_unitario: numOrNull(it.desconto_unitario) }
            : {}),
        })),
      ...(tipo === "COMPRA" &&
        numOrNull(freteTotal) != null &&
        freteTotal !== ""
        ? { frete_total: numOrNull(freteTotal) }
        : {}),
    }),
    [
      partnerId,
      partnerName,
      observacao,
      dataEmissao,
      dataEntrega,
      temNotaFiscal,
      parcelado,
      numeroPromissorias,
      dataPrimeiraPromissoria,
      itens,
      promissoriaDatas,
      freteTotal,
      tipo,
    ],
  );

  const updateOrder = useCallback(
    async (orderId, payloadBase) => {
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
        promissoria_datas: payloadBase.promissoria_datas || [],
        itens: payloadBase.itens,
        // Incluir frete_total no PUT quando presente no payload base (permite persistir/zerar)
        ...(Object.prototype.hasOwnProperty.call(payloadBase, "frete_total")
          ? { frete_total: payloadBase.frete_total }
          : {}),
        ...(migrarFifo ? { migrar_fifo: true } : {}),
      };
      return updateOrderService(editingOrder?.id ?? orderId, body);
    },
    [
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
      editingOrder?.id,
      migrarFifo,
    ],
  );

  const createOrder = useCallback(
    async (payloadBase) => {
      const payload = { tipo, ...payloadBase };
      return createOrderService(payload);
    },
    [tipo],
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payloadBase = buildPayloadBase();

      if (editingOrder?.id) {
        await updateOrder(editingOrder.id, payloadBase);
        if (typeof onSaved === "function") {
          try {
            onSaved({ id: editingOrder.id });
          } catch (_) {
            /* noop */
          }
        }
        setCreated({ id: editingOrder.id, status: editingOrder.status });
        emitInventoryChanged({
          productIds: itens
            .map((it) => Number(it.produto_id))
            .filter((v) => Number.isFinite(v)),
          source: "order-put",
          orderId: editingOrder.id,
        });
        push(`${MSG.PEDIDO_UPDATED} #${editingOrder.id}`, { type: "success" });
      } else {
        const data = await createOrder(payloadBase);
        setCreated({ ...data, status: data.status || "confirmado" });
        if (typeof onCreated === "function") {
          try {
            onCreated(data);
          } catch (_) {
            /* noop */
          }
        }
        emitInventoryChanged({
          productIds: itens
            .map((it) => Number(it.produto_id))
            .filter((v) => Number.isFinite(v)),
          source: "order-post",
          orderId: data.id,
        });
        push(`${MSG.PEDIDO_CREATED} #${data.id}`, { type: "success" });
      }
    } catch (err) {
      push(err.message, { type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!editingOrder?.id) return;
    const ok = window.confirm(
      `Excluir pedido #${editingOrder.id}? Esta ação remove movimentos e itens relacionados.`,
    );
    if (!ok) return;
    try {
      setSubmitting(true);
      await deleteOrderService(editingOrder.id);
      if (typeof onSaved === "function") {
        try {
          onSaved({ id: editingOrder.id, deleted: true });
        } catch (_) {
          /* noop */
        }
      }
      push(`${MSG.PEDIDO_DELETED} #${editingOrder.id}`, { type: "success" });
    } catch (err) {
      push(err.message, { type: "error" });
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
    // helpers
    computeItemTotal,
    computeOrderTotalEstimate,
    // fetchers
    fetchEntities,
    fetchProdutos,
    // ações
    handleSubmit,
    handleDelete,
    // frete total (COMPRA)
    // Frete agregado apenas para COMPRA
    freteTotal,
    setFreteTotal,
    computeLucroBruto,
    // fifo legacy (exposto apenas uma vez)
    fifoAplicado,
    migrarFifo,
    setMigrarFifo,
    // expor pedido em edição para a view (usado para validar fifo_aplicado e mostrar aviso LEGACY)
    editingOrder,
  };
}
