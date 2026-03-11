/* eslint-disable no-unused-vars -- param names in interface are for typing */
import React from "react";
import { formatMoney, formatPercent } from "./shared/formatters";

interface PointRow {
  label: string;
  value: number;
  type?: "money" | "percent" | "raw";
}

interface ActivePointPanelProps {
  point?: { label: string; value?: number } | null;
  prevPoint?: { label: string; value?: number } | null;
  momPct?: number | null;
  acumuladaPct?: number | null;
  rows?: PointRow[];
  moneyFormatter?: (n: number) => string;
  percentFormatter?: (n: number) => string;
  icons?: { mom?: string; acumulado?: string };
  showAcumulado?: boolean;
  showPrev?: boolean;
}

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
  acumuladaPct = 0,
  rows = [],
  moneyFormatter = formatMoney,
  percentFormatter = (n: number) => formatPercent(n, { withSign: true }),
  icons = { mom: "📊", acumulado: "📈" },
  showAcumulado = true,
  showPrev = true,
}: ActivePointPanelProps) {
  if (!point) return null;

  const renderValue = (row: PointRow) => {
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
            <div>
              {moneyFormatter(prevPoint.value ?? 0)}
            </div>
          </div>
        )}
        {showAcumulado && acumuladaPct != null && (
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
