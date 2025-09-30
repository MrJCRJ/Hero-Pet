import React, { useMemo, useState, useCallback } from "react";
import { useToast } from "../entities/shared/toast";
import { useItemDiff } from "./useItemDiff";
import {
  numOrNull,
  mapEditingOrderToItems,
  defaultEmptyItem,
  computeItemTotal as computeItemTotalPure,
} from "./utils";
import {
  updateOrder as updateOrderService,
  createOrder as createOrderService,
  deleteOrder as deleteOrderService,
} from "./service";
import { useSaldoSync, usePedidoFetchers } from "./hooks";
import { emitInventoryChanged } from "./events";

export function usePedidoFormController({ onCreated, onSaved, editingOrder }) {
  const { push } = useToast();
  // Flags para controlar interferência do autogerador de cronograma
  // 1) Evita que a primeira execução sobrescreva o cronograma hidratado
  const skipNextAutoGenRef = React.useRef(false);
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
  // 2) Marca que estamos editando e já hidratamos datas, para não sobrepor em execuções subsequentes
  const editingHydratedRef = React.useRef(
    Boolean(editingOrder?.promissorias && editingOrder.promissorias.length),
  );
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
  const [itens, setItens] = useState([defaultEmptyItem()]);
  const [freteTotal, setFreteTotal] = useState("");
  const [originalItens, setOriginalItens] = useState([]);
  const [created, setCreated] = useState(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [productModalIndex, setProductModalIndex] = useState(null);
  const [showTypeChangeModal, setShowTypeChangeModal] = useState(false);
  const [pendingTipo, setPendingTipo] = useState("");

  // Promissórias
  const [numeroPromissorias, setNumeroPromissorias] = useState(() => {
    const n = Number(editingOrder?.numero_promissorias || 0);
    return Number.isFinite(n) && n > 0 ? n : 1;
  });
  const [dataPrimeiraPromissoria, setDataPrimeiraPromissoria] = useState(() =>
    editingOrder?.data_primeira_promissoria
      ? String(editingOrder.data_primeira_promissoria).slice(0, 10)
      : "",
  );
  const [valorPorPromissoria, setValorPorPromissoria] = useState(() =>
    Number(editingOrder?.valor_por_promissoria || 0),
  );
  // Controle avançado de cronograma
  const [frequenciaPromissorias, setFrequenciaPromissorias] =
    useState("mensal"); // 'mensal' | 'quinzenal' | 'semanal' | 'dias' | 'manual'
  const [intervaloDiasPromissorias, setIntervaloDiasPromissorias] =
    useState(30);
  const [promissoriaDatas, setPromissoriaDatas] = useState(() =>
    Array.isArray(editingOrder?.promissorias) &&
      editingOrder.promissorias.length
      ? editingOrder.promissorias.map((p) => p.due_date).filter(Boolean)
      : [],
  );
  const [promissoriasMeta, setPromissoriasMeta] = useState(() => {
    if (
      Array.isArray(editingOrder?.promissorias) &&
      editingOrder.promissorias.length
    ) {
      const paidSeqs = editingOrder.promissorias
        .filter((p) => p.paid_at)
        .map((p) => p.seq);
      const today = new Date();
      const overdueSeqs = editingOrder.promissorias
        .filter(
          (p) =>
            !p.paid_at &&
            p.due_date &&
            new Date(p.due_date + "T00:00:00") <
            new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        )
        .map((p) => p.seq);
      return { anyPaid: paidSeqs.length > 0, paidSeqs, overdueSeqs };
    }
    return { anyPaid: false, paidSeqs: [], overdueSeqs: [] };
  });

  // Diff de itens
  const { getItemChanges, getItemDiffClass, getItemDiffIcon } = useItemDiff(
    itens,
    originalItens,
    editingOrder,
  );

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
    const nProm = Number(editingOrder.numero_promissorias || 0);
    setNumeroPromissorias(Number.isFinite(nProm) && nProm > 0 ? nProm : 1);
    setDataPrimeiraPromissoria(
      editingOrder.data_primeira_promissoria
        ? String(editingOrder.data_primeira_promissoria).slice(0, 10)
        : "",
    );
    setValorPorPromissoria(Number(editingOrder.valor_por_promissoria || 0));
    const mapped = mapEditingOrderToItems(editingOrder);
    const itensFinais = mapped.length ? mapped : [defaultEmptyItem()];
    setItens(itensFinais);
    setOriginalItens(mapped);
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
    if (
      Array.isArray(editingOrder.promissorias) &&
      editingOrder.promissorias.length
    ) {
      const datas = editingOrder.promissorias
        .map((p) => p.due_date)
        .filter(Boolean);
      setPromissoriaDatas(datas);
      // Evitar que o efeito de geração automática sobreponha imediatamente o cronograma hidratado
      skipNextAutoGenRef.current = true;
      editingHydratedRef.current = true;
      const paidSeqs = editingOrder.promissorias
        .filter((p) => p.paid_at)
        .map((p) => p.seq);
      const today = new Date();
      const overdueSeqs = editingOrder.promissorias
        .filter(
          (p) =>
            !p.paid_at &&
            p.due_date &&
            new Date(p.due_date + "T00:00:00") <
            new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        )
        .map((p) => p.seq);
      setPromissoriasMeta({
        anyPaid: paidSeqs.length > 0,
        paidSeqs,
        overdueSeqs,
      });
    } else {
      setPromissoriasMeta({ anyPaid: false, paidSeqs: [], overdueSeqs: [] });
    }
  }, [editingOrder]);

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

  const updateItem = useCallback((idx, patch) => {
    setItens((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }, []);
  const addItem = useCallback(() => {
    setItens((prev) => [...prev, defaultEmptyItem()]);
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
    // Sistema de promissórias sempre ativo por padrão
    setParcelado(true);
    setItens([defaultEmptyItem()]);
    setCreated(null);
    setFreteTotal("");
  }, []);

  // Forçar temNotaFiscal=true para VENDA (não exibido na UI)
  React.useEffect(() => {
    // Política: VENDA => sempre true; COMPRA => false (não exibido na UI)
    setTemNotaFiscal(tipo === "VENDA");
  }, [tipo]);

  // Saldo para VENDA
  useSaldoSync({ tipo, itens, setItens });

  // Helpers de UI
  const computeItemTotal = useCallback((it) => computeItemTotalPure(it), []);

  const computeOrderTotalEstimate = useCallback(() => {
    const sum = itens.reduce((acc, it) => {
      const t = computeItemTotal(it);
      return acc + (Number.isFinite(Number(t)) ? Number(t) : 0);
    }, 0);
    const freteVal = tipo === "COMPRA" ? Number(freteTotal || 0) : 0;
    return Number(
      (sum + (Number.isFinite(freteVal) ? freteVal : 0)).toFixed(2),
    );
  }, [itens, computeItemTotal, tipo, freteTotal]);

  // Lucro bruto estimado (somente VENDA): soma((preco - desconto - custo)*qtd)
  const computeLucroBruto = useCallback(() => {
    if (tipo !== "VENDA") return 0;
    try {
      return Number(
        itens
          .reduce((acc, it) => {
            const qtd = Number(it.quantidade || 0);
            const preco =
              Number(it.preco_unitario || 0) -
              Number(it.desconto_unitario || 0);
            const custoRaw = Number(
              it.custo_fifo_unitario != null
                ? it.custo_fifo_unitario
                : it.custo_base_unitario,
            );
            if (
              qtd > 0 &&
              preco > 0 &&
              Number.isFinite(custoRaw) &&
              custoRaw > 0
            ) {
              return acc + (preco - custoRaw) * qtd;
            }
            return acc;
          }, 0)
          .toFixed(2),
      );
    } catch {
      return 0;
    }
  }, [itens, tipo]);

  // Atualiza valor por promissória quando total muda
  React.useEffect(() => {
    const total = computeOrderTotalEstimate();
    if (numeroPromissorias > 0) {
      const next = Number((total / numeroPromissorias).toFixed(2));
      if (valorPorPromissoria !== next) setValorPorPromissoria(next);
    }
  }, [itens, numeroPromissorias, computeOrderTotalEstimate, computeLucroBruto, valorPorPromissoria]);

  // Gerar cronograma quando não está no modo manual
  React.useEffect(() => {
    // Se a próxima execução deve ser ignorada (cronograma acabou de ser hidratado), não gerar nada
    if (skipNextAutoGenRef.current) {
      skipNextAutoGenRef.current = false;
      return;
    }
    // Se estamos editando e já temos datas hidratadas, não regenerar automaticamente
    if (
      editingHydratedRef.current &&
      Array.isArray(promissoriaDatas) &&
      promissoriaDatas.length > 0
    ) {
      return;
    }
    // Não limpar datas no modo manual, mesmo que parcelado esteja falso em ordens antigas
    if (frequenciaPromissorias === "manual") return; // manter manual
    if (
      !dataPrimeiraPromissoria ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dataPrimeiraPromissoria) ||
      !numeroPromissorias ||
      numeroPromissorias < 2
    ) {
      if (Array.isArray(promissoriaDatas) && promissoriaDatas.length)
        setPromissoriaDatas([]);
      return;
    }
    const base = new Date(dataPrimeiraPromissoria);
    if (isNaN(base.getTime())) return; // data inválida em digitação parcial
    const datas = [];
    for (let i = 0; i < numeroPromissorias; i++) {
      const d = new Date(base);
      if (frequenciaPromissorias === "mensal") {
        d.setMonth(d.getMonth() + i);
      } else if (frequenciaPromissorias === "quinzenal") {
        d.setDate(d.getDate() + i * 15);
      } else if (frequenciaPromissorias === "semanal") {
        d.setDate(d.getDate() + i * 7);
      } else if (frequenciaPromissorias === "dias") {
        const n = Number(intervaloDiasPromissorias) || 30;
        d.setDate(d.getDate() + i * n);
      }
      try {
        const iso = d.toISOString().slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) datas.push(iso);
      } catch (_) {
        // ignora datas inválidas geradas por overflow raro
      }
    }
    const isSame =
      Array.isArray(promissoriaDatas) &&
      promissoriaDatas.length === datas.length &&
      promissoriaDatas.every((v, i) => v === datas[i]);
    if (!isSame) setPromissoriaDatas(datas);
  }, [
    parcelado,
    frequenciaPromissorias,
    dataPrimeiraPromissoria,
    numeroPromissorias,
    intervaloDiasPromissorias,
    promissoriaDatas,
  ]);

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
        push(`Pedido #${editingOrder.id} atualizado.`, { type: "success" });
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
      push(`Pedido #${editingOrder.id} excluído.`, { type: "success" });
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
