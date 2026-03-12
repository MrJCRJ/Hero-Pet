import React from "react";
import { Button } from "components/ui/Button";
import { SelectionModal } from "components/common/SelectionModal";
import useProductFormLogic from "./hooks/useProductFormLogic";
import ProductFormSuppliersSection from "./ProductFormSuppliersSection";

export function ProductForm({ initial = {}, onSubmit, submitting }) {
  const logic = useProductFormLogic({ initial, onSubmit });
  const [categorias, setCategorias] = React.useState<string[]>([]);
  const [fabricantes, setFabricantes] = React.useState<string[]>([]);
  React.useEffect(() => {
    fetch("/api/v1/produtos/categorias", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => (Array.isArray(arr) ? arr : []))
      .then(setCategorias)
      .catch(() => setCategorias([]));
    fetch("/api/v1/produtos/fabricantes", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => (Array.isArray(arr) ? arr : []))
      .then(setFabricantes)
      .catch(() => setFabricantes([]));
  }, []);
  const {
    nome,
    setNome,
    categoria,
    setCategoria,
    fabricante,
    setFabricante,
    descricao,
    setDescricao,
    fotoUrl,
    setFotoUrl,
    supplierLabels,
    suppliers,
    showSupplierModal,
    setShowSupplierModal,
    handleSubmit,
    removeSupplier,
    clearSuppliers,
    addSupplier,
  } = logic;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <label className="text-sm">
          <span className="block mb-1">Link da foto</span>
          <input
            type="url"
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            placeholder="https://..."
            value={fotoUrl}
            onChange={(e) => setFotoUrl(e.target.value)}
          />
          {fotoUrl && (
            <img
              src={fotoUrl}
              alt="Preview"
              className="mt-2 h-20 w-20 object-cover rounded border border-[var(--color-border)]"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
        </label>
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
            list="categorias-list"
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            placeholder="Digite ou selecione uma categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          />
          <datalist id="categorias-list">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="text-sm">
          <span className="block mb-1">Fabricante</span>
          <input
            list="fabricantes-list"
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            placeholder="Digite ou selecione o fabricante"
            value={fabricante}
            onChange={(e) => setFabricante(e.target.value)}
          />
          <datalist id="fabricantes-list">
            {fabricantes.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
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
        <SelectionModal<{ id: number; label: string; name: string }>
          title="Selecionar Fornecedor (PJ)"
          fetcher={async (q) => {
            const url = `/api/v1/entities?q=${encodeURIComponent(q)}&ativo=true&entity_type=PJ`;
            const res = await fetch(url, { cache: "no-store" });
            const data = await res.json();
            if (!res.ok)
              throw new Error(data?.error || "Falha na busca de fornecedores");
            return data.map((e: { id: number; name: string; entity_type: string }) => ({
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
          emptyMessage="Nenhum fornecedor encontrado"
          footer={null}
        />
      )}
    </form>
  );
}
