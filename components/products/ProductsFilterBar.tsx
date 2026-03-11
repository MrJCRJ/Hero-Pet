import React from "react";
import { Button } from "components/ui/Button";

export default function ProductsFilterBar({
  query,
  setQ,
  setCategoria,
  setAtivo,
  onlyBelowMin,
  setOnlyBelowMin,
  linkSupplierId,
  openNew,
  refresh,
  searchInputRef,
}) {
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
          value={query.ativo}
          onChange={(e) => setAtivo(e.target.value)}
        >
          <option value="">Ativo: Todos</option>
          <option value="true">Somente ativos</option>
          <option value="false">Somente inativos</option>
        </select>
        <label className="flex items-center gap-2 text-sm px-1">
          <input
            type="checkbox"
            checked={onlyBelowMin}
            onChange={(e) => setOnlyBelowMin(e.target.checked)}
          />
          Abaixo do mínimo
        </label>
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
