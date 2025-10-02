import React from "react";
import LineAreaChart from "components/common/LineAreaChart";

/**
 * ProductCostHistoryChart
 * Exibe histórico de custo médio mensal com variação mês a mês e acumulada.
 * Responsabilidade isolada para reduzir tamanho de `products/manager.js`.
 */
export function ProductCostHistoryChart({ data, loading }) {
  const parsed = Array.isArray(data)
    ? data
        .filter((d) => d && d.month && Number.isFinite(Number(d.avg_cost)))
        .map((d) => ({ label: d.month, value: Number(d.avg_cost) }))
    : [];
  const [focused, setFocused] = React.useState(null);
  const firstVal = parsed.length ? parsed[0].value : 0;
  const lastPoint = parsed[parsed.length - 1] || null;
  const active = focused || lastPoint;
  const acumuladaPct =
    active && firstVal !== 0 ? ((active.value - firstVal) / firstVal) * 100 : 0;
  const prevPoint =
    active && parsed.length > 1
      ? (() => {
          const idx = parsed.findIndex((p) => p.label === active.label);
          if (idx > 0) return parsed[idx - 1];
          return null;
        })()
      : null;

  const momPct =
    prevPoint && active
      ? ((active.value - prevPoint.value) / prevPoint.value) * 100
      : 0;

  return (
    <div className="p-2 border rounded bg-[var(--color-bg-secondary)]/40">
      {loading && (
        <div className="text-xs opacity-60">Carregando custos...</div>
      )}
      {!loading && parsed.length === 0 && (
        <div className="text-xs opacity-60">Sem histórico suficiente.</div>
      )}
      {parsed.length > 0 && (
        <div className="space-y-3">
          <LineAreaChart
            data={parsed}
            onFocus={(label) => {
              const f = parsed.find((p) => p.label === label) || null;
              setFocused(f);
            }}
            onBlur={() => setFocused(null)}
          />
          <div className="flex gap-6 text-xs">
            <div>
              <div className="text-[10px] uppercase opacity-60 tracking-wide">
                Var. Mês
              </div>
              <div
                className={`text-sm font-semibold ${!prevPoint ? "opacity-50" : momPct > 0 ? "text-green-500" : momPct < 0 ? "text-red-400" : ""}`}
              >
                {!prevPoint
                  ? "—"
                  : `${momPct > 0 ? "+" : ""}${momPct.toFixed(1)}%`}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase opacity-60 tracking-wide">
                Var. Acumulada
              </div>
              <div
                className={`text-sm font-semibold ${acumuladaPct === 0 ? "opacity-70" : acumuladaPct > 0 ? "text-green-500" : "text-red-400"}`}
              >
                {active
                  ? `${acumuladaPct > 0 ? "+" : ""}${acumuladaPct.toFixed(1)}%`
                  : "—"}
              </div>
            </div>
          </div>
          <div className="pt-2 border-t text-[11px] opacity-70 leading-snug">
            Passe o mouse sobre os pontos. Sem hover mostra o último mês.
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductCostHistoryChart;
