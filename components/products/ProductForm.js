import React, { useState } from "react";
import { Button } from "components/ui/Button";
import { SelectionModal } from "components/common/SelectionModal";

export function ProductForm({ initial = {}, onSubmit, submitting }) {
  const [nome, setNome] = useState(initial.nome || "");
  const [categoria, setCategoria] = useState(initial.categoria || "");
  const [codigoBarras, setCodigoBarras] = useState(initial.codigo_barras || "");
  const [ativo, setAtivo] = useState(initial.ativo ?? true);
  const [descricao, setDescricao] = useState(initial.descricao || "");
  const [precoTabela, setPrecoTabela] = useState(
    initial.preco_tabela !== undefined && initial.preco_tabela !== null
      ? String(initial.preco_tabela)
      : "",
  );
  const [markupPercent, setMarkupPercent] = useState(
    initial.markup_percent_default !== undefined &&
      initial.markup_percent_default !== null
      ? String(initial.markup_percent_default)
      : "",
  );
  const [estoqueMinimo, setEstoqueMinimo] = useState(
    initial.estoque_minimo !== undefined && initial.estoque_minimo !== null
      ? String(initial.estoque_minimo)
      : "",
  );
  const [suppliers, setSuppliers] = useState(
    Array.isArray(initial.suppliers) ? initial.suppliers : [],
  );
  const [supplierLabels, setSupplierLabels] = useState(
    Array.isArray(initial.supplier_labels)
      ? initial.supplier_labels.map((s) => ({
          id: s.id,
          label: s.name || s.label || String(s.id),
        }))
      : [],
  );
  const [showSupplierModal, setShowSupplierModal] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!nome.trim()) return alert("Nome é obrigatório");
    if (!suppliers.length)
      return alert("Selecione ao menos um fornecedor (PJ)");
    onSubmit({
      nome: nome.trim(),
      categoria: categoria || null,
      codigo_barras: codigoBarras || null,
      ativo,
      descricao: descricao || null,
      preco_tabela: precoTabela === "" ? null : Number(precoTabela),
      markup_percent_default:
        markupPercent === "" ? null : Number(markupPercent),
      estoque_minimo: estoqueMinimo === "" ? null : Number(estoqueMinimo),
      suppliers,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm">
          <span className="block mb-1">Nome *</span>
          <input
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </label>
        <label className="text-sm">
          <span className="block mb-1">Categoria</span>
          <input
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="block mb-1">Preço Tabela</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              value={precoTabela}
              onChange={(e) => setPrecoTabela(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1">Markup % (default)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              value={markupPercent}
              onChange={(e) => setMarkupPercent(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="block mb-1">Estoque mínimo</span>
            <input
              type="number"
              step="1"
              min="0"
              className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(e.target.value)}
            />
          </label>
        </div>
        <label className="text-sm">
          <span className="block mb-1">Código de Barras</span>
          <input
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            value={codigoBarras}
            onChange={(e) => setCodigoBarras(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          Ativo
        </label>
        <div className="text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="block">Fornecedores *</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                fullWidth={false}
                onClick={() => setShowSupplierModal(true)}
              >
                Adicionar fornecedor
              </Button>
              {suppliers.length > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onClick={() => {
                    setSuppliers([]);
                    setSupplierLabels([]);
                  }}
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>
          <div className="min-h-[38px] px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
            {supplierLabels.length ? (
              <div className="flex flex-wrap gap-2">
                {supplierLabels.map((s) => (
                  <span
                    key={s.id}
                    className="text-xs px-2 py-0.5 rounded-full border border-[var(--color-border)]"
                  >
                    {s.label}
                    <button
                      className="ml-2 opacity-70 hover:opacity-100"
                      onClick={(e) => {
                        e.preventDefault();
                        setSuppliers((prev) =>
                          prev.filter((id) => id !== s.id),
                        );
                        setSupplierLabels((prev) =>
                          prev.filter((x) => x.id !== s.id),
                        );
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="opacity-60 text-xs">
                Nenhum fornecedor selecionado
              </span>
            )}
          </div>
        </div>
        <label className="text-sm">
          <span className="block mb-1">Descrição</span>
          <textarea
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" loading={submitting} fullWidth={false}>
          Salvar
        </Button>
      </div>
      {showSupplierModal && (
        <SelectionModal
          title="Selecionar Fornecedor (PJ)"
          fetcher={async (q) => {
            const url = `/api/v1/entities?q=${encodeURIComponent(q)}&ativo=true&entity_type=PJ`;
            const res = await fetch(url, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok)
              throw new Error(data?.error || "Falha na busca de fornecedores");
            return data.map((e) => ({
              id: e.id,
              label: `${e.name} • ${e.entity_type}`,
              name: e.name,
            }));
          }}
          extractLabel={(it) => it.label}
          onSelect={(it) => {
            setShowSupplierModal(false);
            if (it) {
              setSuppliers((prev) =>
                prev.includes(it.id) ? prev : [...prev, it.id],
              );
              setSupplierLabels((prev) =>
                prev.find((x) => x.id === it.id)
                  ? prev
                  : [...prev, { id: it.id, label: it.label }],
              );
            }
          }}
          onClose={() => setShowSupplierModal(false)}
        />
      )}
    </form>
  );
}
