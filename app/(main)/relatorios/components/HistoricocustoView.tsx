"use client";

import React, { useEffect, useState } from "react";
import ProductCostHistoryChart from "components/products/ProductCostHistoryChart";

interface Produto { id: number; nome: string }
interface CostPoint { month?: string | number; avg_cost?: number }

export function HistoricocustoView() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [costData, setCostData] = useState<CostPoint[]>([]);
  const [months] = useState(12);

  useEffect(() => {
    fetch("/api/v1/produtos?fields=id-nome&limit=500", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((arr) => (Array.isArray(arr) ? arr : []))
      .then((rows) => setProdutos(rows as Produto[]))
      .catch(() => setProdutos([]));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setCostData([]);
      return;
    }
    setLoading(true);
    fetch(`/api/v1/produtos/${selectedId}/custos_historicos?months=${months}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((json) => {
        let items: CostPoint[] = [];
        if (Array.isArray(json)) items = json;
        else if (Array.isArray(json?.data)) items = json.data;
        items = items
          .slice()
          .sort((a, b) => String(a.month).localeCompare(String(b.month)));
        setCostData(items);
      })
      .catch(() => setCostData([]))
      .finally(() => setLoading(false));
  }, [selectedId, months]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
          Produto
        </label>
        <select
          className="w-full max-w-md px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-primary)]"
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Selecione um produto</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>
      {selectedId && (
        <ProductCostHistoryChart loading={loading} data={costData} />
      )}
    </div>
  );
}
