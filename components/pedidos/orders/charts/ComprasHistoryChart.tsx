import React from "react";
import LineAreaChart from "../../../common/LineAreaChart";
import ActivePointPanel from "./ActivePointPanel";
import TimeSeriesTable from "./TimeSeriesTable";
import { useTimeSeriesActivePoint } from "./hooks/useTimeSeriesActivePoint";
import { formatMoney, formatPercent } from "./shared/formatters";

export default function ComprasHistoryChart({ comprasHistory }) {
  const safeHistory = Array.isArray(comprasHistory) ? comprasHistory : [];
  const chartData = safeHistory.map((item) => ({
    label: item.month,
    value: Number(item.compras || 0),
  }));

  const {
    activePoint,
    prevPoint,
    momPct,
    acumuladaPct,
    setHovered,
    toggleSelect,
    selected,
  } = useTimeSeriesActivePoint(chartData);

  if (!chartData.length) {
    return (
      <div className="text-xs opacity-70 mt-2">Sem histórico de compras.</div>
    );
  }

  return (
    <div className="mt-4">
      <h4 className="font-semibold mb-2">Histórico de Compras (12 meses)</h4>
      <LineAreaChart
        data={chartData}
        colorVar="--color-warning"
        height={180}
        formatValue={(v) => formatMoney(v)}
        onHover={setHovered}
        onSelectPoint={toggleSelect}
        selectedLabel={selected?.label}
      />

      {activePoint && (
        <ActivePointPanel
          point={activePoint}
          prevPoint={prevPoint}
          momPct={momPct}
          acumuladaPct={acumuladaPct}
          rows={[{ label: "Compras", value: activePoint.value, type: "money" }]}
          icons={{ mom: "📊", acumulado: "📈" }}
          percentFormatter={(n) => formatPercent(n, { withSign: true })}
        />
      )}
      <TimeSeriesTable
        getRowClass={() => ""}
        data={[...chartData].reverse().map((p, idx, arr) => {
          const originalPrevVal =
            idx < arr.length - 1 ? arr[idx + 1].value : null;
          return {
            ...p,
            delta: originalPrevVal != null ? p.value - originalPrevVal : null,
            momLocal:
              originalPrevVal && originalPrevVal !== 0
                ? ((p.value - originalPrevVal) / originalPrevVal) * 100
                : null,
          };
        })}
        activeLabel={activePoint?.label}
        onRowClick={toggleSelect}
        columns={[
          { key: "label", header: "Mês", colSpan: "col-span-3" },
          {
            key: "value",
            header: "Compras",
            colSpan: "col-span-3",
            align: "right",
            render: (row, { formatMoney }) =>
              formatMoney(Number((row as { value: number }).value)),
          },
          {
            key: "momLocal",
            header: "MoM % 📊",
            colSpan: "col-span-3",
            align: "right",
            render: (row, { formatPercent }) => {
              const r = row as { momLocal?: number | null };
              return r.momLocal != null
                ? formatPercent(r.momLocal, { withSign: true })
                : "—";
            },
          },
          {
            key: "delta",
            header: "Δ Absoluto 📈",
            colSpan: "col-span-3",
            align: "right",
            render: (row, { formatMoney }) => {
              const r = row as { delta?: number | null };
              return r.delta != null ? formatMoney(r.delta) : "—";
            },
          },
        ]}
      />

      {/* Glossário */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">
          💡 Glossário:
        </h4>
        <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
          <div>
            <strong>MoM %:</strong> Crescimento/decréscimo percentual em relação
            ao mês anterior
          </div>
          <div>
            <strong>Δ Absoluto:</strong> Diferença em valores monetários entre
            meses consecutivos
          </div>
        </div>
      </div>
    </div>
  );
}
