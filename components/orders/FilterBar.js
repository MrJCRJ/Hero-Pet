import React from "react";
import { Button } from "../ui/Button";

export default function FilterBar({ filters, onChange, onReload }) {
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
      <div>
        <label className="block text-xs mb-1">Emissão (De)</label>
        <input
          type="date"
          className="border rounded px-2 py-1"
          value={filters.from || ""}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-xs mb-1">Emissão (Até)</label>
        <input
          type="date"
          className="border rounded px-2 py-1"
          value={filters.to || ""}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
        />
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
      <Button fullWidth={false} onClick={onReload}>
        Atualizar
      </Button>
    </div>
  );
}
