import { useEffect, useState } from "react";

// Encapsula custo médio/último custo/saldo e min_hint para estoque mínimo sugerido
export default function useProductCosts(rows) {
  const [costMap, setCostMap] = useState({});

  // Busca saldos/custos para produtos visíveis
  useEffect(() => {
    const ids = rows.map((r) => r.id).filter((id) => Number.isFinite(Number(id)));
    const missing = ids.filter((id) => !(id in costMap));
    if (!missing.length) return;
    (async () => {
      await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await fetch(`/api/v1/estoque/saldos?produto_id=${id}`, {
              cache: "no-store",
            });
            const data = await res.json();
            if (res.ok) {
              const cm = Number(data?.custo_medio);
              const uc = Number(data?.ultimo_custo);
              const sd = Number(data?.saldo);
              setCostMap((prev) => ({
                ...prev,
                [id]: {
                  saldo: Number.isFinite(sd) ? sd : null,
                  custo_medio: Number.isFinite(cm) ? cm : null,
                  ultimo_custo: Number.isFinite(uc) ? uc : null,
                },
              }));
            } else {
              setCostMap((prev) => ({
                ...prev,
                [id]: { saldo: null, custo_medio: null, ultimo_custo: null },
              }));
            }
          } catch (_) {
            setCostMap((prev) => ({
              ...prev,
              [id]: { saldo: null, custo_medio: null, ultimo_custo: null },
            }));
          }
        }),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // Busca min_hint (30 dias) para produtos sem mínimo cadastrado
  useEffect(() => {
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const missing = rows
      .filter(
        (p) =>
          p.estoque_minimo == null &&
          !(costMap[p.id] && Object.prototype.hasOwnProperty.call(costMap[p.id], "min_hint")),
      )
      .map((p) => p.id);
    if (!missing.length) return;
    (async () => {
      await Promise.all(
        missing.map(async (id) => {
          try {
            const url = `/api/v1/estoque/movimentos?produto_id=${id}&tipo=SAIDA&from=${encodeURIComponent(from)}&limit=200`;
            const res = await fetch(url, { cache: "no-store" });
            const data = await res.json();
            let hint = null;
            if (res.ok && Array.isArray(data)) {
              const totalSaida = data.reduce((acc, mv) => acc + (Number(mv.quantidade) || 0), 0);
              hint = Math.max(0, Math.ceil(totalSaida));
            }
            setCostMap((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), min_hint: hint } }));
          } catch (_) {
            setCostMap((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), min_hint: null } }));
          }
        }),
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  return { costMap };
}
