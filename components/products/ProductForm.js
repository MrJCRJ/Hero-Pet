import React from "react";
import { Button } from "components/ui/Button";
import { SelectionModal } from "components/common/SelectionModal";
import useProductFormLogic from "./hooks/useProductFormLogic";
import ProductFormPricingSection from "./ProductFormPricingSection";
import ProductFormSuppliersSection from "./ProductFormSuppliersSection";

export function ProductForm({ initial = {}, onSubmit, submitting }) {
  // Hook isolando lógica e efeitos
  const logic = useProductFormLogic({ initial, onSubmit });
  const {
    nome,
    setNome,
    categoria,
    setCategoria,
    codigoBarras,
    setCodigoBarras,
    ativo,
    setAtivo,
    descricao,
    setDescricao,
    precoTabela,
    markupPercent,
    estoqueMinimo,
    supplierLabels,
    suppliers,
    showSupplierModal,
    setShowSupplierModal,
    suggestedPreco,
    suggestedOrigin,
    estoqueHint,
    handleSubmit,
    removeSupplier,
    clearSuppliers,
    addSupplier,
  } = logic;

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
        <ProductFormPricingSection
          precoTabela={precoTabela}
          suggestedPreco={suggestedPreco}
          suggestedOrigin={suggestedOrigin}
          markupPercent={markupPercent}
          estoqueMinimo={estoqueMinimo}
          estoqueHint={estoqueHint}
        />
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
        <ProductFormSuppliersSection
          suppliers={suppliers}
          supplierLabels={supplierLabels}
          setShowSupplierModal={setShowSupplierModal}
          clearSuppliers={clearSuppliers}
          removeSupplier={removeSupplier}
        />
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
            addSupplier(it);
          }}
          onClose={() => setShowSupplierModal(false)}
        />
      )}
    </form>
  );
}
