import React, { useMemo, useState } from "react";
import { Button } from "./ui/Button";
import { FormContainer, FormField } from "./ui/Form";
import { useToast } from "./entities/shared/toast";
import { Autocomplete } from "./common/Autocomplete";

function numOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function PedidoForm({ onCreated }) {
  const { push } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [tipo, setTipo] = useState("VENDA");
  const [partnerId, setPartnerId] = useState("");
  const [partnerLabel, setPartnerLabel] = useState("");
  const [observacao, setObservacao] = useState("");
  const [itens, setItens] = useState([
    { produto_id: "", produto_label: "", quantidade: "", preco_unitario: "", desconto_unitario: "" },
  ]);
  const [created, setCreated] = useState(null); // armazena pedido criado

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
      { produto_id: "", produto_label: "", quantidade: "", preco_unitario: "", desconto_unitario: "" },
    ]);
  };
  const removeItem = (idx) => {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  };
  const clearForm = () => {
    setTipo("VENDA");
    setPartnerId("");
    setObservacao("");
    setItens([{ produto_id: "", produto_label: "", quantidade: "", preco_unitario: "", desconto_unitario: "" }]);
    setCreated(null);
  };

  // Fetch helpers for autocomplete
  const fetchEntities = async (q) => {
    const entityTypeParam = tipo === "COMPRA" ? `&entity_type=PJ` : "";
    const url = `/api/v1/entities?q=${encodeURIComponent(q)}&ativo=true${entityTypeParam}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Falha na busca de entidades");
    return data.map((e) => ({ id: e.id, label: `${e.name} • ${e.entity_type}` }));
  };

  const fetchProdutos = async (q) => {
    const url = `/api/v1/produtos?q=${encodeURIComponent(q)}&ativo=true&fields=id-nome`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Falha na busca de produtos");
    return data.map((p) => ({ id: p.id, label: p.nome }));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = {
        tipo,
        partner_entity_id: Number(partnerId),
        observacao: observacao || null,
        itens: itens
          .filter((it) => Number.isFinite(Number(it.produto_id)) && Number(it.quantidade) > 0)
          .map((it) => ({
            produto_id: Number(it.produto_id),
            quantidade: Number(it.quantidade),
            // Enviar somente se numéricos — servidor usa preco_tabela quando ausente
            ...(numOrNull(it.preco_unitario) != null
              ? { preco_unitario: numOrNull(it.preco_unitario) }
              : {}),
            ...(numOrNull(it.desconto_unitario) != null
              ? { desconto_unitario: numOrNull(it.desconto_unitario) }
              : {}),
          })),
      };
      const res = await fetch("/api/v1/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao criar pedido");
      setCreated(data);
      if (typeof onCreated === "function") {
        try { onCreated(data); } catch (_) { /* noop */ }
      }
      push(`Pedido #${data.id} criado como rascunho.`, { type: "success" });
    } catch (err) {
      push(err.message, { type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!created?.id) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/pedidos/${created.id}/confirm`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Falha ao confirmar pedido");
      push(`Pedido #${created.id} confirmado.`, { type: "success" });
      setCreated({ ...created, status: "confirmado" });
    } catch (err) {
      push(err.message, { type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormContainer title="Pedido (MVP)" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs mb-1 text-[var(--color-text-secondary)]">Tipo</label>
          <select
            className="w-full border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg-primary)]"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="VENDA">VENDA</option>
            <option value="COMPRA">COMPRA</option>
          </select>
        </div>

        <div>
          <Autocomplete
            label="Cliente/Fornecedor (ativo)"
            placeholder="Busque por nome ou documento"
            fetcher={fetchEntities}
            initialValue={partnerLabel}
            onSelect={(it) => {
              if (!it) {
                setPartnerId("");
                setPartnerLabel("");
                return;
              }
              setPartnerId(String(it.id));
              setPartnerLabel(it.label);
            }}
          />
          {partnerId && (
            <p className="text-xs mt-1 opacity-70">Selecionado: #{partnerId} — {partnerLabel}</p>
          )}
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
          <Button onClick={addItem} variant="outline" size="sm" fullWidth={false}>
            + Adicionar item
          </Button>
        </div>
        <div className="space-y-3">
          {itens.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-3">
                <Autocomplete
                  label="Produto"
                  placeholder="Busque por nome, código ou barras"
                  fetcher={fetchProdutos}
                  initialValue={it.produto_label}
                  onSelect={(sel) => {
                    if (!sel) return updateItem(idx, { produto_id: "", produto_label: "" });
                    updateItem(idx, { produto_id: String(sel.id), produto_label: sel.label });
                  }}
                />
                {it.produto_id && (
                  <p className="text-xs mt-1 opacity-70">Selecionado: #{it.produto_id} — {it.produto_label}</p>
                )}
              </div>
              <div className="col-span-2">
                <FormField
                  label="Quantidade"
                  name={`quantidade_${idx}`}
                  value={it.quantidade}
                  onChange={(e) => updateItem(idx, { quantidade: e.target.value })}
                  type="number"
                  min="0"
                  step="0.001"
                  required
                />
              </div>
              <div className="col-span-3">
                <FormField
                  label="Preço Unitário (opcional)"
                  name={`preco_${idx}`}
                  value={it.preco_unitario}
                  onChange={(e) => updateItem(idx, { preco_unitario: e.target.value })}
                  type="number"
                  step="0.01"
                />
              </div>
              <div className="col-span-3">
                <FormField
                  label="Desconto Unitário (opcional)"
                  name={`desconto_${idx}`}
                  value={it.desconto_unitario}
                  onChange={(e) => updateItem(idx, { desconto_unitario: e.target.value })}
                  type="number"
                  step="0.01"
                />
              </div>
              <div className="col-span-1 flex items-center justify-end pb-2">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onClick={() => removeItem(idx)}
                  disabled={itens.length === 1}
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 mt-8">
        {created?.id && (
          <>
            <span className="text-xs opacity-80 mr-auto">
              Criado: #{created.id} • Status: {created.status}
            </span>
            <Button
              onClick={handleConfirm}
              variant="primary"
              size="sm"
              fullWidth={false}
              disabled={submitting}
            >
              Confirmar Pedido
            </Button>
          </>
        )}
        <Button onClick={clearForm} variant="outline" size="sm" fullWidth={false} disabled={submitting}>
          Limpar
        </Button>
        <Button type="submit" variant="primary" size="sm" fullWidth={false} disabled={!canSubmit || submitting}>
          {submitting ? "Enviando..." : "Criar Pedido"}
        </Button>
      </div>
    </FormContainer>
  );
}
