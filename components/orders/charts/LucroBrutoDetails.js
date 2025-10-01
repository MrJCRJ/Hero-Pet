import React from "react";
import LineAreaChart from "../../common/LineAreaChart";

/**
 * Componente que exibe detalhes do lucro bruto com gráfico interativo
 */
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

  const [hovered, setHovered] = React.useState(null);
  const [selected, setSelected] = React.useState(null);

  const firstVal = chartData.length ? chartData[0].value : 0;
  const fallbackPoint = chartData[chartData.length - 1] || null;
  const active = selected || hovered || fallbackPoint;

  const acumuladaPct =
    active && firstVal !== 0 ? ((active.value - firstVal) / firstVal) * 100 : 0;

  const prevPoint = active
    ? (() => {
        const idx = chartData.findIndex((p) => p.label === active.label);
        return idx > 0 ? chartData[idx - 1] : null;
      })()
    : null;

  const momPct =
    prevPoint && prevPoint.value !== 0
      ? ((active.value - prevPoint.value) / prevPoint.value) * 100
      : 0;

  function fmtMoney(n) {
    return Number(n || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-[360px]">
          <LineAreaChart
            data={chartData}
            showArea
            disableTooltip
            enableCrosshair
            onHover={(pt) => setHovered(pt)}
            onSelectPoint={(pt) =>
              setSelected((p) => (p && p.label === pt.label ? null : pt))
            }
            selectedLabel={selected?.label}
          />
        </div>
        <div className="w-full md:w-64 flex flex-col gap-3 text-xs border rounded p-3 bg-[var(--color-bg-secondary)]">
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">
              Mês
            </div>
            <div className="text-sm font-semibold">{active?.label || "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">
              Lucro Bruto
            </div>
            <div className="text-sm font-semibold">
              {active ? fmtMoney(active.value) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">
              Receita
            </div>
            <div className="text-sm font-semibold">
              {active ? fmtMoney(active.receita) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">
              COGS
            </div>
            <div className="text-sm font-semibold">
              {active ? fmtMoney(active.cogs) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">
              Margem
            </div>
            <div className="text-sm font-semibold">
              {active ? `${active.margem.toFixed(1)}%` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">
              Var. Mês→Mês
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
          <div className="pt-2 border-t text-[11px] opacity-70 leading-snug">
            Lucro bruto = Receita - COGS (baseado em COGS reconhecido por mês).
            Clique para fixar um mês; clique novamente para soltar.
          </div>
        </div>
      </div>
      <div className="text-xs opacity-70">
        A série utiliza os mesmos meses de growthHistory. Margem calculada
        on-the-fly.
      </div>
    </div>
  );
}
