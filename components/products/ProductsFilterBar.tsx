import React, { useEffect, useState } from "react";
import { Button } from "components/ui/Button";

export default function ProductsFilterBar({
  query,
  setQ,
  setCategoria,
  setSupplierId,
  setAtivo,
  linkSupplierId,
  openNew,
  refresh,
  searchInputRef,
}) {
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/v1/entities?entity_type=PJ&ativo=true&limit=200", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => (Array.isArray(arr) ? arr : []))
      .then((rows) => setSuppliers(rows as { id: number; name: string }[]))
      .catch(() => setSuppliers([]));
  }, []);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          ref={searchInputRef}
          className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          placeholder="Buscar por nome (q)"
          value={query.q}
          onChange={(e) => setQ(e.target.value)}
        />
        <input
          className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          placeholder="Categoria"
          value={query.categoria}
          onChange={(e) => setCategoria(e.target.value)}
        />
        <select
          className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          value={query.supplier_id ?? ""}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="">Fornecedor: Todos</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          value={query.ativo}
          onChange={(e) => setAtivo(e.target.value)}
        >
          <option value="">Ativo: Todos</option>
          <option value="true">Somente ativos</option>
          <option value="false">Somente inativos</option>
        </select>
      </div>

      <div className="flex justify-between items-center gap-2">
        <div>
          <Button variant="outline" onClick={refresh} fullWidth={false}>
            Atualizar
          </Button>
        </div>
        {Number.isFinite(Number(linkSupplierId)) && (
          <Button
            onClick={() =>
              openNew({ ativo: true, suppliers: [Number(linkSupplierId)] })
            }
          >
            Novo Produto para Fornecedor #{Number(linkSupplierId)}
          </Button>
        )}
        <Button onClick={() => openNew()}>Novo Produto</Button>
      </div>
    </div>
  );
}
