import React from "react";
import LineAreaChart from "../../common/LineAreaChart";
import { formatBRL } from "../shared/utils";

/**
 * Componente que exibe o histórico de compras em gráfico e tabela
 */
export default function ComprasHistoryChart({ comprasHistory }) {
  if (!comprasHistory?.length) return null;

  const data = comprasHistory.map((r) => ({
    label: r.month,
    value: r.compras,
  }));

  return (
    <div className="mt-4">
      <h4 className="font-semibold mb-2">Histórico de Compras (12 meses)</h4>
      <LineAreaChart
        data={data}
        color="var(--color-warning)"
        height={180}
        formatValue={(v) => formatBRL(v)}
      />
      <div className="grid grid-cols-12 text-xs mt-2 font-medium text-gray-500 dark:text-gray-400">
        <div className="col-span-3">Mês</div>
        <div className="col-span-3 text-right">Compras</div>
        <div className="col-span-3 text-right">MoM %</div>
        <div className="col-span-3 text-right">Δ Absoluto</div>
      </div>
      {comprasHistory.map((r, i) => {
        const prev = i > 0 ? comprasHistory[i - 1].compras : null;
        const delta = prev != null ? r.compras - prev : null;
        return (
          <div
            key={r.month}
            className="grid grid-cols-12 text-xs py-0.5 border-b border-gray-100 dark:border-gray-800 last:border-none"
          >
            <div className="col-span-3">{r.month}</div>
            <div className="col-span-3 text-right">{formatBRL(r.compras)}</div>
            <div className="col-span-3 text-right">
              {r.crescimento != null ? `${r.crescimento}%` : "-"}
            </div>
            <div className="col-span-3 text-right">
              {delta != null ? formatBRL(delta) : "-"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
