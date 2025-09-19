import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { useToast } from "../entities/shared/toast";

function FilterBar({ filters, onChange, onReload }) {
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
        <label className="block text-xs mb-1">Status</label>
        <select
          className="border rounded px-2 py-1"
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
        >
          <option value="">Todos</option>
          <option value="rascunho">rascunho</option>
          <option value="confirmado">confirmado</option>
          <option value="cancelado">cancelado</option>
        </select>
      </div>
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs mb-1">Busca</label>
        <input
          className="w-full border rounded px-2 py-1"
          placeholder="Parceiro ou documento"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
        />
      </div>
      <Button fullWidth={false} onClick={onReload}>Atualizar</Button>
    </div>
  );
}

function usePedidos(filters, limit = 20) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.tipo) p.set("tipo", filters.tipo);
    if (filters.status) p.set("status", filters.status);
    if (filters.q) p.set("q", filters.q);
    p.set("limit", String(limit));
    return p.toString();
  }, [filters, limit]);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/pedidos?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar pedidos");
      setData(Array.isArray(json?.data) ? json.data : json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return { loading, data, reload };
}

export function OrdersManager({ limit = 20 }) {
  const { push } = useToast();
  const [filters, setFilters] = useState({ tipo: "", status: "", q: "" });
  const { loading, data, reload } = usePedidos(filters, limit);

  const confirm = async (id) => {
    try {
      const res = await fetch(`/api/v1/pedidos/${id}/confirm`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Falha ao confirmar pedido");
      push(`Pedido #${id} confirmado.`, { type: "success" });
      reload();
    } catch (e) {
      push(e.message, { type: "error" });
    }
  };

  return (
    <div className="text-sm">
      <FilterBar filters={filters} onChange={setFilters} onReload={reload} />
      <div className="overflow-auto border rounded">
        <table className="min-w-full">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              <th className="text-left px-3 py-2">#</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Parceiro</th>
              <th className="text-left px-3 py-2">Emissão</th>
              <th className="text-right px-3 py-2">Total</th>
              <th className="text-right px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{p.id}</td>
                <td className="px-3 py-2">{p.tipo}</td>
                <td className="px-3 py-2">{p.status}</td>
                <td className="px-3 py-2">{p.partner_name || `#${p.partner_entity_id}`}</td>
                <td className="px-3 py-2">{p.data_emissao ? new Date(p.data_emissao).toLocaleDateString() : '-'}</td>
                <td className="px-3 py-2 text-right">{typeof p.total_liquido === 'number' ? p.total_liquido.toLocaleString(undefined, { style: 'currency', currency: 'BRL' }) : '-'}</td>
                <td className="px-3 py-2 text-right">
                  {p.status === 'rascunho' ? (
                    <Button size="sm" fullWidth={false} onClick={() => confirm(p.id)}>Confirmar</Button>
                  ) : (
                    <span className="opacity-60">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && data.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={7}>Nenhum pedido encontrado</td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={7}>Carregando...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
