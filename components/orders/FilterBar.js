import React from "react";
import { Button } from "../ui/Button";

export default function FilterBar({ filters, onChange, onReload, onClear }) {
  return (
    <div className="flex flex-wrap gap-2 items-end mb-3">
      <div>
        <label className="block text-xs mb-1">Tipo</label>
        <select
          className="border rounded px-2 py-1"
          value={filters.tipo}
          onChange={(e) => onChange({ ...filters, tipo: e.target.value })}
        >
          <option value="">Todos</option>
          <option value="VENDA">VENDA</option>
          <option value="COMPRA">COMPRA</option>
        </select>
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs mb-1">Busca</label>
        <input
          className="w-full border rounded px-2 py-1"
          placeholder="ID (#123), parceiro ou documento"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button fullWidth={false} onClick={onReload}>
          Atualizar
        </Button>
        <Button
          type="button"
          variant="secondary"
          fullWidth={false}
          onClick={onClear}
        >
          Limpar
        </Button>
      </div>
    </div>
  );
}
