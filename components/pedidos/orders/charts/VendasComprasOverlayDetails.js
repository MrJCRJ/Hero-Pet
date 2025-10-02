import React from "react";
import LineAreaChart from "../../../common/LineAreaChart";
import ActivePointPanel from "./ActivePointPanel";
import TimeSeriesTable from "./TimeSeriesTable";
import { useTimeSeriesActivePoint } from "./hooks/useTimeSeriesActivePoint";
import { formatMoney, formatPercent } from "./shared/formatters";

export default function VendasComprasOverlayDetails({ data }) {
  const history = Array.isArray(data.growthHistory) ? data.growthHistory : [];

  const chartData = history.map((h) => ({
    label: h.month,
    value: Number(h.vendas || 0),
    crescimento: h.crescimento,
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

  return (
    <div className="mt-4">
      <h4 className="font-semibold mb-2">Histórico de Vendas (12 meses)</h4>
      <LineAreaChart
        data={chartData}
        color="var(--color-accent)"
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
          rows={[{ label: "Vendas", value: activePoint.value, type: "money" }]}
          icons={{ mom: "📊", acumulado: "📈" }}
          percentFormatter={(n) => formatPercent(n, { withSign: true })}
        />
      )}
      <TimeSeriesTable
        data={[...chartData].reverse().map((p, idx, arr) => {
          // Como invertido, prev lógico é o próximo no array original (arr[idx+1])
          const originalPrev = idx < arr.length - 1 ? arr[idx + 1].value : null;
          return {
            ...p,
            delta: originalPrev != null ? p.value - originalPrev : null,
          };
        })}
        activeLabel={activePoint?.label}
        onRowClick={toggleSelect}
        columns={[
          { key: "label", header: "Mês", colSpan: "col-span-3" },
          {
            key: "value",
            header: "Vendas",
            colSpan: "col-span-3",
            align: "right",
            render: (row, { formatMoney }) => formatMoney(row.value),
          },
          {
            key: "crescimento",
            header: "MoM % 📊",
            colSpan: "col-span-3",
            align: "right",
            render: (row, { formatPercent }) =>
              row.crescimento != null
                ? formatPercent(row.crescimento, { withSign: true })
                : "—",
          },
          {
            key: "delta",
            header: "Δ Absoluto 📈",
            colSpan: "col-span-3",
            align: "right",
            render: (row, { formatMoney }) =>
              row.delta != null ? formatMoney(row.delta) : "—",
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
            vendas e compras
          </div>
        </div>
      </div>
    </div>
  );
}
