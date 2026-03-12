import { useEffect, useState } from "react";

// Encapsula custo médio/último custo/saldo e min_hint para estoque mínimo sugerido
export default function useProductCosts(rows) {
  const [costMap, setCostMap] = useState({});

  // Busca saldos/custos para produtos visíveis
  useEffect(() => {
    const ids = rows
      .map((r) => r.id)
      .filter((id) => Number.isFinite(Number(id)));
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
              const mh = Number(data?.min_hint);
              setCostMap((prev) => ({
                ...prev,
                [id]: {
                  saldo: Number.isFinite(sd) ? sd : null,
                  custo_medio: Number.isFinite(cm) ? cm : null,
                  ultimo_custo: Number.isFinite(uc) ? uc : null,
                  min_hint: Number.isFinite(mh) ? mh : null,
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

  return { costMap };
}
