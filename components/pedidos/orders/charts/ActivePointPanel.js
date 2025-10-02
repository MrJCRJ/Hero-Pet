import React from "react";
import { formatMoney, formatPercent } from "./shared/formatters";

/**
 * Painel reutilizável para exibir detalhes do ponto ativo em gráficos de séries temporais.
 * Props:
 *  - point: { label }
 *  - prevPoint: ponto anterior (ou null)
 *  - momPct: número ou null (variação percentual mês a mês)
 *  - acumuladaPct: número (variação acumulada desde o primeiro mês)
 *  - rows: array de { label, value, type?: 'money' | 'percent' | 'raw' }
 *  - moneyFormatter?: fn custom (default formatMoney)
 *  - percentFormatter?: fn custom
 *  - icons?: { mom?: string, acumulado?: string }
 */
export default function ActivePointPanel({
  point,
  prevPoint,
  momPct,
  acumuladaPct,
  rows = [],
  moneyFormatter = formatMoney,
  percentFormatter = (n) => formatPercent(n, { withSign: true }),
  icons = { mom: "📊", acumulado: "📈" },
  showAcumulado = true,
  showPrev = true,
}) {
  if (!point) return null;

  const renderValue = (row) => {
    const { value, type } = row;
    if (type === "money")
      return <span className="font-semibold">{moneyFormatter(value)}</span>;
    if (type === "percent")
      return <span className="font-semibold">{percentFormatter(value)}</span>;
    return <span className="font-semibold">{value}</span>;
  };

  return (
    <div className="mt-3 p-3 bg-[var(--color-bg-secondary)] border rounded text-xs">
      <div className="font-medium mb-2">{point.label}</div>
      <div className="grid grid-cols-2 gap-3">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="opacity-70">{row.label}</div>
            {renderValue(row)}
          </div>
        ))}
        {momPct != null && (
          <div>
            <div className="opacity-70">MoM {icons.mom}</div>
            <div
              className={`font-semibold ${momPct >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {percentFormatter(momPct)}
            </div>
          </div>
        )}
        {showPrev && prevPoint && (
          <div>
            <div className="opacity-70">Mês anterior</div>
            <div>{moneyFormatter(prevPoint.value)}</div>
          </div>
        )}
        {showAcumulado && (
          <div>
            <div className="opacity-70">Acumulado {icons.acumulado}</div>
            <div
              className={`${acumuladaPct >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {percentFormatter(acumuladaPct)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
