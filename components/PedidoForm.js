import React, { useMemo, useState } from "react";
import { Button } from "./ui/Button";
import { FormContainer, FormField } from "./ui/Form";
import { useToast } from "./entities/shared/toast";
// Autocomplete removido neste fluxo; usando apenas SelectionModal
// import { Autocomplete } from "./common/Autocomplete";
import { SelectionModal } from "./common/SelectionModal";

function numOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function PedidoForm({ onCreated, onSaved, editingOrder }) {
  const { push } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [tipo, setTipo] = useState("VENDA");
  const [partnerId, setPartnerId] = useState("");
  const [partnerLabel, setPartnerLabel] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState([
    { produto_id: "", produto_label: "", quantidade: "", preco_unitario: "", desconto_unitario: "", produto_saldo: null },
  ]);
  const [created, setCreated] = useState(null); // armazena pedido criado
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [productModalIndex, setProductModalIndex] = useState(null); // índice do item para selecionar produto

  // Preenche estado quando está editando um pedido existente
  React.useEffect(() => {
    if (!editingOrder) return;
    setTipo(editingOrder.tipo || "VENDA");
    setPartnerId(String(editingOrder.partner_entity_id || ""));
    setPartnerLabel(editingOrder.partner_name || "");
    setPartnerName(editingOrder.partner_name || "");
    setObservacao(editingOrder.observacao || "");
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
    setItens(mapped.length ? mapped : [{ produto_id: "", produto_label: "", quantidade: "", preco_unitario: "", desconto_unitario: "", produto_saldo: null }]);
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
    setObservacao("");
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
        const body = { observacao: observacao || null, partner_name: partnerName || null };
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
        push(`Pedido #${data.id} criado.`, { type: "success" });
      }
    } catch (err) {
      push(err.message, { type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  // Duplica rascunho removido no CRUD sem rascunhos

  // Confirmar não é mais necessário (pedido já nasce confirmado)

  const isEditing = !!editingOrder?.id;
  const isDraft = false;

  return (
    <FormContainer title="Pedido (MVP)" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs mb-1 text-[var(--color-text-secondary)]">Tipo</label>
          <select
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg-primary)]"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            disabled={isEditing}
          >
            <option value="VENDA">VENDA</option>
            <option value="COMPRA">COMPRA</option>
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 text-[var(--color-text-secondary)]">Cliente/Fornecedor (ativo)</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 text-sm px-3 py-2 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] min-h-[38px] flex items-center">
              {partnerLabel || <span className="opacity-60">Nenhum selecionado</span>}
            </div>
            <Button variant="outline" size="sm" fullWidth={false} onClick={() => setShowPartnerModal(true)} disabled={isEditing}>
              Buscar...
            </Button>
          </div>
        </div>

        <div className="md:col-span-1">
          <FormField
            label="Observação"
            name="observacao"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Itens</h3>
          <Button onClick={addItem} variant="outline" size="sm" fullWidth={false} disabled={isEditing && !isDraft}>
            + Adicionar item
          </Button>
        </div>
        {isEditing && (
          <p className="text-xs opacity-70 mb-2">Após criar o pedido, itens, parceiro e tipo ficam bloqueados. Você pode editar a Observação.</p>
        )}
        <div className="space-y-3">
          {itens.map((it, idx) => (
            <div key={idx} className="border border-[var(--color-border)] rounded-md p-3 bg-[var(--color-bg-primary)]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{it.produto_label || 'Produto não selecionado'}</span>
                  {tipo === 'VENDA' && Number(it.produto_id) > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                      Estoque: {it.produto_saldo != null ? Number(it.produto_saldo).toFixed(3) : '...'}
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth={false}
                  onClick={() => {
                    if (tipo === 'COMPRA' && !Number.isFinite(Number(partnerId))) {
                      push('Selecione um fornecedor primeiro', { type: 'error' });
                      return;
                    }
                    setProductModalIndex(idx);
                  }}
                  disabled={isEditing}
                >
                  {it.produto_id ? 'Trocar' : 'Buscar...'}
                </Button>
              </div>

              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-3 md:col-span-2">
                  <FormField
                    label="Quantidade"
                    name={`quantidade_${idx}`}
                    value={it.quantidade}
                    onChange={(e) => updateItem(idx, { quantidade: e.target.value })}
                    type="number"
                    min="0"
                    step="0.001"
                    disabled={isEditing}
                    required
                  />
                </div>
                <div className="col-span-4 md:col-span-3">
                  <FormField
                    label="Preço Unitário (opcional)"
                    name={`preco_${idx}`}
                    value={it.preco_unitario}
                    onChange={(e) => updateItem(idx, { preco_unitario: e.target.value })}
                    type="number"
                    step="0.01"
                    disabled={isEditing}
                  />
                </div>
                <div className="col-span-4 md:col-span-3">
                  <FormField
                    label="Desconto Unitário (opcional)"
                    name={`desconto_${idx}`}
                    value={it.desconto_unitario}
                    onChange={(e) => updateItem(idx, { desconto_unitario: e.target.value })}
                    type="number"
                    step="0.01"
                    disabled={isEditing}
                  />
                </div>
                <div className="col-span-12 md:col-span-3 flex items-center justify-between md:justify-end gap-3 mt-2 md:mt-0">
                  <div className="text-sm opacity-80">
                    <span className="block text-xs mb-1">Total do item</span>
                    <span className="font-semibold">{(() => { const t = computeItemTotal(it); return t != null ? t.toFixed(2) : '—'; })()}</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    onClick={() => removeItem(idx)}
                    disabled={itens.length === 1 || isEditing}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 mt-8">
        {created?.id && (
          <span className="text-xs opacity-80 mr-auto">
            Criado: #{created.id} • Status: {created.status || 'confirmado'}
          </span>
        )}
        <Button onClick={clearForm} variant="outline" size="sm" fullWidth={false} disabled={submitting}>
          Limpar
        </Button>
        <Button type="submit" variant="primary" size="sm" fullWidth={false} disabled={!canSubmit || submitting}>
          {submitting ? (editingOrder?.id ? "Atualizando..." : "Enviando...") : (editingOrder?.id ? "Atualizar Pedido" : "Criar Pedido")}
        </Button>
      </div>

      {showPartnerModal && (
        <SelectionModal
          title="Selecionar Cliente/Fornecedor"
          fetcher={fetchEntities}
          extractLabel={(it) => it.label}
          onSelect={(it) => {
            setShowPartnerModal(false);
            if (it) {
              setPartnerId(String(it.id));
              setPartnerLabel(it.label);
              setPartnerName(it.name || it.label);
            }
          }}
          onClose={() => setShowPartnerModal(false)}
          emptyMessage={tipo === 'VENDA' ? 'Nenhum cliente ativo encontrado' : 'Nenhum fornecedor ativo encontrado'}
        />
      )}

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
