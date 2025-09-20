import React, { useMemo, useState, useCallback } from "react";
import { FormContainer } from "./ui/Form";
import { useToast } from "./entities/shared/toast";
import { SelectionModal } from "./common/SelectionModal";
import { PedidoFormHeader } from "./pedido/PedidoFormHeader";
import { PedidoFormItems } from "./pedido/PedidoFormItems";
import { PedidoFormActions } from "./pedido/PedidoFormActions";
import { PedidoFormPromissorias } from "./pedido/PedidoFormPromissorias";
import { useItemDiff } from "./pedido/useItemDiff";

function numOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function PedidoForm({ onCreated, onSaved, editingOrder }) {
  const { push } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [tipo, setTipo] = useState("VENDA");
  const [originalTipo, setOriginalTipo] = useState("VENDA"); // para detectar mudança
  const [partnerId, setPartnerId] = useState("");
  const [partnerLabel, setPartnerLabel] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [observacao, setObservacao] = useState("");
  const [dataEntrega, setDataEntrega] = useState("");
  const [temNotaFiscal, setTemNotaFiscal] = useState(false);
  const [parcelado, setParcelado] = useState(false);
  const [itens, setItens] = useState([
    { produto_id: "", produto_label: "", quantidade: "", preco_unitario: "", desconto_unitario: "", produto_saldo: null },
  ]);
  const [originalItens, setOriginalItens] = useState([]); // para diff visual
  const [created, setCreated] = useState(null); // armazena pedido criado
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [productModalIndex, setProductModalIndex] = useState(null); // índice do item para selecionar produto
  const [showTypeChangeModal, setShowTypeChangeModal] = useState(false);
  const [pendingTipo, setPendingTipo] = useState("");

  // Promissórias
  const [numeroPromissorias, setNumeroPromissorias] = useState(1);
  const [dataPrimeiraPromissoria, setDataPrimeiraPromissoria] = useState("");
  const [valorPorPromissoria, setValorPorPromissoria] = useState(0);

  // Hook para lógica de diff dos itens
  const { getItemChanges, getItemDiffClass, getItemDiffIcon } = useItemDiff(itens, originalItens, editingOrder);

  // Preenche estado quando está editando um pedido existente
  React.useEffect(() => {
    if (!editingOrder) return;
    const tipoOriginal = editingOrder.tipo || "VENDA";
    setTipo(tipoOriginal);
    setOriginalTipo(tipoOriginal);
    setPartnerId(String(editingOrder.partner_entity_id || ""));
    setPartnerLabel(editingOrder.partner_name || "");
    setPartnerName(editingOrder.partner_name || "");
    setObservacao(editingOrder.observacao || "");
    setDataEntrega(editingOrder.data_entrega ? new Date(editingOrder.data_entrega).toISOString().slice(0, 10) : "");
    setTemNotaFiscal(Boolean(editingOrder.tem_nota_fiscal));
    setParcelado(Boolean(editingOrder.parcelado));
    // Promissórias (se presentes)
    const nProm = Number(editingOrder.numero_promissorias || 0);
    setNumeroPromissorias(Number.isFinite(nProm) && nProm > 0 ? nProm : 1);
    setDataPrimeiraPromissoria(editingOrder.data_primeira_promissoria ? String(editingOrder.data_primeira_promissoria).slice(0, 10) : "");
    setValorPorPromissoria(Number(editingOrder.valor_por_promissoria || 0));
    const mapped = Array.isArray(editingOrder.itens)
      ? editingOrder.itens.map((it) => ({
        produto_id: String(it.produto_id),
        produto_label: it.produto_nome || "",
        quantidade: String(it.quantidade),
        preco_unitario: it.preco_unitario != null ? String(it.preco_unitario) : "",
        desconto_unitario: it.desconto_unitario != null ? String(it.desconto_unitario) : "",
        produto_saldo: null,
      }))
      : [];
    const itensFinais = mapped.length ? mapped : [{ produto_id: "", produto_label: "", quantidade: "", preco_unitario: "", desconto_unitario: "", produto_saldo: null }];
    setItens(itensFinais);
    setOriginalItens(mapped); // salva para diff
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

  const updateItem = (idx, patch) => {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => {
    setItens((prev) => [
      ...prev,
      { produto_id: "", produto_label: "", quantidade: "", preco_unitario: "", desconto_unitario: "", produto_saldo: null },
    ]);
  };
  const removeItem = (idx) => {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  };
  const clearForm = () => {
    setTipo("VENDA");
    setPartnerId("");
    setPartnerLabel("");
    setPartnerName("");
    setObservacao("");
    setDataEntrega("");
    setTemNotaFiscal(false);
    setParcelado(false);
    setItens([{ produto_id: "", produto_label: "", quantidade: "", preco_unitario: "", desconto_unitario: "", produto_saldo: null }]);
    setCreated(null);
  };

  // Busca saldo de estoque para VENDA
  async function fetchSaldo(produtoId) {
    try {
      const res = await fetch(`/api/v1/estoque/saldos?produto_id=${produtoId}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao buscar saldo");
      return Number(data.saldo);
    } catch (_) {
      return null;
    }
  }

  // Quando selecionar produto em VENDA, buscar saldo
  React.useEffect(() => {
    if (tipo !== "VENDA") return;
    let cancelled = false;
    (async () => {
      let changed = false;
      const next = await Promise.all(itens.map(async (it) => {
        if (!it.produto_id || isNaN(Number(it.produto_id))) return it;
        if (it.produto_saldo != null) return it; // já tem saldo
        const saldo = await fetchSaldo(Number(it.produto_id));
        if (cancelled) return it;
        changed = true;
        return { ...it, produto_saldo: saldo };
      }));
      if (!cancelled && changed) setItens(next);
    })();
    return () => { cancelled = true; };
  }, [tipo, itens]);

  // Helpers de UI
  function computeItemTotal(it) {
    const qtd = Number(it.quantidade);
    const preco = numOrNull(it.preco_unitario);
    const desc = numOrNull(it.desconto_unitario) || 0;
    if (!Number.isFinite(qtd) || !Number.isFinite(preco)) return null;
    const total = (preco - desc) * qtd;
    return Number.isFinite(total) ? total : null;
  }

  const computeOrderTotalEstimate = useCallback(() => {
    const sum = itens.reduce((acc, it) => {
      const t = computeItemTotal(it);
      return acc + (Number.isFinite(Number(t)) ? Number(t) : 0);
    }, 0);
    return Number(sum.toFixed(2));
  }, [itens]);

  // Atualiza valor por promissória quando total estimado muda
  React.useEffect(() => {
    const total = computeOrderTotalEstimate();
    if (numeroPromissorias > 0) {
      setValorPorPromissoria(Number((total / numeroPromissorias).toFixed(2)));
    }
  }, [itens, numeroPromissorias, computeOrderTotalEstimate]);

  // Fetch helpers for autocomplete
  const fetchEntities = async (q) => {
    // Em VENDA: listar apenas PF (clientes). Em COMPRA: apenas PJ (fornecedores)
    const entityTypeParam = tipo === "COMPRA" ? `&entity_type=PJ` : `&entity_type=PF`;
    // Buscar pelo perfil (nome) e não pelo documento: usar q_name
    const url = `/api/v1/entities?q_name=${encodeURIComponent(q)}&ativo=true${entityTypeParam}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Falha na busca de entidades");
    return data.map((e) => ({ id: e.id, label: `${e.name} • ${e.entity_type}`, name: e.name }));
  };

  const fetchProdutos = async (q) => {
    // Em COMPRA: filtrar por fornecedor selecionado, mostrando apenas produtos relacionados
    const supplierFilter = tipo === 'COMPRA' && Number.isFinite(Number(partnerId))
      ? `&supplier_id=${Number(partnerId)}`
      : '';
    const url = `/api/v1/produtos?q=${encodeURIComponent(q)}&ativo=true&fields=id-nome${supplierFilter}`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Falha na busca de produtos");
    return data.map((p) => ({ id: p.id, label: p.nome }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payloadBase = {
        partner_entity_id: Number(partnerId),
        partner_name: partnerName || null,
        observacao: observacao || null,
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
      };

      if (editingOrder?.id) {
        // Atualiza pedido existente
        // CRUD sem rascunho: após criado, não permitir alterar itens, tipo e parceiro (mantém consistência de estoque)
        const body = {
          tipo,
          partner_entity_id: Number(partnerId),
          observacao: observacao || null,
          partner_name: partnerName || null,
          data_entrega: dataEntrega || null,
          tem_nota_fiscal: temNotaFiscal,
          parcelado: parcelado,
          numero_promissorias: Number(numeroPromissorias) || 1,
          data_primeira_promissoria: dataPrimeiraPromissoria || null,
          itens: payloadBase.itens,
        };
        const res = await fetch(`/api/v1/pedidos/${editingOrder.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Falha ao atualizar pedido");
        if (typeof onSaved === "function") {
          try { onSaved({ id: editingOrder.id }); } catch (_) { /* noop */ }
        }
        // preserva status atual ao editar
        setCreated({ id: editingOrder.id, status: editingOrder.status });
        try {
          // Emetir evento de inventário (não afeta saldo, mas permite UI reagir)
          const productIds = itens.map((it) => Number(it.produto_id)).filter((v) => Number.isFinite(v));
          window.dispatchEvent(new CustomEvent('inventory-changed', { detail: { productIds, source: 'order-put', orderId: editingOrder.id } }));
        } catch (_) { /* noop */ }
        push(`Pedido #${editingOrder.id} atualizado.`, { type: "success" });
      } else {
        // Cria novo pedido
        const payload = { tipo, ...payloadBase };
        const res = await fetch("/api/v1/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Falha ao criar pedido");
        setCreated({ ...data, status: data.status || "confirmado" });
        if (typeof onCreated === "function") {
          try { onCreated(data); } catch (_) { /* noop */ }
        }
        try {
          const productIds = itens.map((it) => Number(it.produto_id)).filter((v) => Number.isFinite(v));
          window.dispatchEvent(new CustomEvent('inventory-changed', { detail: { productIds, source: 'order-post', orderId: data.id } }));
        } catch (_) { /* noop */ }
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
      const res = await fetch(`/api/v1/pedidos/${editingOrder.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Falha ao excluir pedido');
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

  // Duplica rascunho removido no CRUD sem rascunhos

  // Confirmar não é mais necessário (pedido já nasce confirmado)

  // Função para lidar com mudança de tipo
  function handleTipoChange(novoTipo) {
    // Se é um pedido novo ou não houve mudança, aplicar diretamente
    if (!editingOrder || novoTipo === originalTipo) {
      setTipo(novoTipo);
      return;
    }

    // Se está mudando tipo de pedido existente, pedir confirmação
    setPendingTipo(novoTipo);
    setShowTypeChangeModal(true);
  }

  function confirmTipoChange() {
    setTipo(pendingTipo);
    setShowTypeChangeModal(false);
    setPendingTipo("");
    // Limpar partner pois tipo novo pode ter regras diferentes
    setPartnerId("");
    setPartnerLabel("");
    setPartnerName("");
  }

  function cancelTipoChange() {
    setShowTypeChangeModal(false);
    setPendingTipo("");
  }

  return (
    <FormContainer title="Pedido (MVP)" onSubmit={handleSubmit}>
      <PedidoFormHeader
        tipo={tipo}
        onTipoChange={handleTipoChange}
        partnerLabel={partnerLabel}
        onPartnerSelect={(it) => {
          setShowPartnerModal(false);
          if (it) {
            setPartnerId(String(it.id));
            setPartnerLabel(it.label);
            setPartnerName(it.name || it.label);
          }
        }}
        observacao={observacao}
        onObservacaoChange={setObservacao}
        dataEntrega={dataEntrega}
        onDataEntregaChange={setDataEntrega}
        temNotaFiscal={temNotaFiscal}
        onTemNotaFiscalChange={setTemNotaFiscal}
        parcelado={parcelado}
        onParceladoChange={setParcelado}
        showPartnerModal={showPartnerModal}
        onShowPartnerModal={setShowPartnerModal}
        fetchEntities={fetchEntities}
        showTypeChangeModal={showTypeChangeModal}
        originalTipo={originalTipo}
        pendingTipo={pendingTipo}
        onConfirmTipoChange={confirmTipoChange}
        onCancelTipoChange={cancelTipoChange}
      />

      {/* Itens do pedido */}
      <PedidoFormItems
        itens={itens}
        onUpdateItem={updateItem}
        onAddItem={addItem}
        onRemoveItem={removeItem}
        tipo={tipo}
        partnerId={partnerId}
        computeItemTotal={computeItemTotal}
        getItemDiffClass={getItemDiffClass}
        getItemDiffIcon={getItemDiffIcon}
        getItemChanges={getItemChanges}
        originalItens={originalItens}
        editingOrder={editingOrder}
        productModalIndex={productModalIndex}
        onSetProductModalIndex={setProductModalIndex}
        fetchProdutos={fetchProdutos}
      />

      {/* Promissórias */}
      <PedidoFormPromissorias
        parcelado={parcelado}
        onParceladoChange={setParcelado}
        numeroPromissorias={numeroPromissorias}
        onNumeroPromissoriasChange={(n, valorCalc) => {
          setNumeroPromissorias(n);
          if (Number.isFinite(Number(valorCalc))) setValorPorPromissoria(Number(valorCalc));
        }}
        dataPrimeiraPromissoria={dataPrimeiraPromissoria}
        onDataPrimeiraPromissoriasChange={setDataPrimeiraPromissoria}
        valorPorPromissoria={valorPorPromissoria}
        totalLiquido={computeOrderTotalEstimate()}
      />

      {/* Ações */}
      <PedidoFormActions
        created={created}
        editingOrder={editingOrder}
        onDelete={handleDelete}
        onClear={clearForm}
        canSubmit={canSubmit}
        submitting={submitting}
        temNotaFiscal={temNotaFiscal}
      />

      {Number.isInteger(productModalIndex) && productModalIndex >= 0 && (
        <SelectionModal
          title="Selecionar Produto"
          fetcher={fetchProdutos}
          extractLabel={(it) => it.label}
          onSelect={(it) => {
            const targetIndex = productModalIndex;
            setProductModalIndex(null);
            if (it && Number.isInteger(targetIndex)) {
              updateItem(targetIndex, { produto_id: String(it.id), produto_label: it.label, produto_saldo: null });
              if (tipo === 'VENDA') {
                // buscar saldo após seleção
                fetchSaldo(it.id).then((saldo) => {
                  setItens((prev) => prev.map((row, i) => i === targetIndex ? { ...row, produto_saldo: saldo } : row));
                }).catch(() => {
                  setItens((prev) => prev.map((row, i) => i === targetIndex ? { ...row, produto_saldo: null } : row));
                });
              }
            }
          }}
          onClose={() => setProductModalIndex(null)}
          emptyMessage={tipo === 'COMPRA' ? 'Este fornecedor não possui produtos relacionados' : 'Nenhum produto encontrado'}
          footer={tipo === 'COMPRA' && Number.isFinite(Number(partnerId)) ? (
            <button
              type="button"
              className="text-xs px-2 py-1 border rounded hover:bg-[var(--color-bg-secondary)]"
              onClick={() => {
                // Navega para Produtos com contexto de vincular fornecedor via hash
                const target = `#tab=products&linkSupplierId=${Number(partnerId)}`;
                try { window.location.hash = target; } catch (_) { /* noop */ }
                setProductModalIndex(null);
              }}
            >
              + Vincular produto ao fornecedor
            </button>
          ) : null}
        />
      )}
    </FormContainer>
  );
}
