import React from "react";
import LineAreaChart from "../../common/LineAreaChart";
import ActivePointPanel from "./ActivePointPanel";
import TimeSeriesTable from "./TimeSeriesTable";
import { useTimeSeriesActivePoint } from "./hooks/useTimeSeriesActivePoint";
import { formatMoney, formatPercent } from "./shared/formatters";

export default function LucroBrutoDetails({ data }) {
  const history = Array.isArray(data.growthHistory) ? data.growthHistory : [];

  // Monta pontos com lucro bruto (vendas - cogs) e margem
  const chartData = history.map((h) => {
    const vendas = Number(h.vendas || 0);
    const cogs = Number(h.cogs || 0);
    const lucro = vendas - cogs;
    return {
      label: h.month,
      value: lucro,
      receita: vendas,
      cogs,
      margem: vendas > 0 ? (lucro / vendas) * 100 : 0,
    };
  });

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
      <h4 className="font-semibold mb-2">Histórico de Lucro Bruto (12 meses)</h4>
      <LineAreaChart
        data={chartData}
        color="var(--color-success)"
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
          rows={[{ label: 'Lucro Bruto', value: activePoint.value, type: 'money' }]}
          icons={{ mom: '📊', acumulado: '📈' }}
          percentFormatter={(n) => formatPercent(n, { withSign: true })}
        />
      )}
      <TimeSeriesTable
        data={chartData.map((p, i) => {
          const prev = i > 0 ? chartData[i - 1] : null;
          return {
            ...p,
            momLocal: prev && prev.value !== 0 ? ((p.value - prev.value) / prev.value) * 100 : null,
          };
        })}
        activeLabel={activePoint?.label}
        onRowClick={toggleSelect}
        columns={[
          { key: 'label', header: 'Mês', colSpan: 'col-span-2' },
          { key: 'value', header: 'Lucro', colSpan: 'col-span-2', align: 'right', render: (row, { formatMoney }) => formatMoney(row.value) },
          { key: 'receita', header: 'Receita', colSpan: 'col-span-2', align: 'right', render: (row, { formatMoney }) => formatMoney(row.receita) },
          { key: 'cogs', header: 'COGS 💰', colSpan: 'col-span-2', align: 'right', render: (row, { formatMoney }) => formatMoney(row.cogs) },
          { key: 'margem', header: 'Margem % 📊', colSpan: 'col-span-2', align: 'right', render: (row, { formatPercent }) => formatPercent(row.margem, { withSign: false }) },
          { key: 'momLocal', header: 'MoM % 📊', colSpan: 'col-span-2', align: 'right', render: (row, { formatPercent }) => row.momLocal != null ? formatPercent(row.momLocal, { withSign: true }) : '—' },
        ]}
      />

      {/* Glossário */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-2">💡 Glossário:</h4>
        <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
          <div><strong>COGS:</strong> Custo dos Produtos Vendidos</div>
          <div><strong>Margem:</strong> Porcentagem de lucro sobre as vendas</div>
          <div><strong>MoM %:</strong> Crescimento/decréscimo percentual em relação ao mês anterior</div>
        </div>
      </div>
    </div>
  );
}
