import React from "react";
import DualLineChart from "../../common/DualLineChart";

/**
 * Componente que compara vendas vs compras com detalhes interativos
 */
export default function VendasComprasOverlayDetails({ data }) {
  const historyV = Array.isArray(data.growthHistory) ? data.growthHistory : [];
  const historyC = Array.isArray(data.comprasHistory)
    ? data.comprasHistory
    : [];

  const seriesV = {
    label: "Vendas",
    color: "var(--color-accent)",
    data: historyV.map((h) => ({
      label: h.month,
      value: Number(h.vendas || 0),
      crescimento: h.crescimento,
    })),
  };

  const seriesC = {
    label: "Compras",
    color: "#f59e0b",
    data: historyC.map((h) => ({
      label: h.month,
      value: Number(h.compras || 0),
      crescimento: h.crescimento,
    })),
  };

  const [hovered, setHovered] = React.useState(null);
  const [selected, setSelected] = React.useState(null);

  const composite = selected || hovered;

  function fmt(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const diff = composite
    ? Number(composite.a?.value || 0) - Number(composite.b?.value || 0)
    : 0;

  const ratio =
    composite && Number(composite.a?.value) > 0
      ? (Number(composite.b?.value || 0) / Number(composite.a?.value || 1)) *
        100
      : null;

  const prevLabel = (() => {
    if (!composite) return null;
    const idx = seriesV.data.findIndex((p) => p.label === composite.label);
    if (idx > 0) return seriesV.data[idx - 1].label;
    return null;
  })();

  const prevV = prevLabel
    ? seriesV.data.find((p) => p.label === prevLabel)
    : null;
  const prevC = prevLabel
    ? seriesC.data.find((p) => p.label === prevLabel)
    : null;

  const momV =
    composite && prevV && prevV.value !== 0
      ? ((composite.a?.value - prevV.value) / prevV.value) * 100
      : null;

  const momC =
    composite && prevC && prevC.value !== 0
      ? ((composite.b?.value - prevC.value) / prevC.value) * 100
      : null;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-[360px]">
          <DualLineChart
            seriesA={seriesV}
            seriesB={seriesC}
            onHoverPoint={(pt) => setHovered(pt)}
            onSelectPoint={(pt) =>
              setSelected((p) => (p && p.label === pt.label ? null : pt))
            }
            selectedLabel={selected?.label}
          />
        </div>
        <div className="w-full md:w-72 flex flex-col gap-3 text-xs border rounded p-3 bg-[var(--color-bg-secondary)]">
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">
              Mês
            </div>
            <div className="text-sm font-semibold">
              {composite?.label || "—"}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase opacity-60 tracking-wide">
                Vendas
              </div>
              <div className="text-sm font-semibold">
                {composite ? fmt(composite.a?.value) : "—"}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase opacity-60 tracking-wide">
                Compras
              </div>
              <div className="text-sm font-semibold">
                {composite ? fmt(composite.b?.value) : "—"}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase opacity-60 tracking-wide">
                MoM Vendas
              </div>
              <div
                className={`text-sm font-semibold ${momV == null ? "opacity-50" : momV > 0 ? "text-green-500" : momV < 0 ? "text-red-400" : ""}`}
              >
                {momV == null
                  ? "—"
                  : `${momV > 0 ? "+" : ""}${momV.toFixed(1)}%`}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase opacity-60 tracking-wide">
                MoM Compras
              </div>
              <div
                className={`text-sm font-semibold ${momC == null ? "opacity-50" : momC > 0 ? "text-green-500" : momC < 0 ? "text-red-400" : ""}`}
              >
                {momC == null
                  ? "—"
                  : `${momC > 0 ? "+" : ""}${momC.toFixed(1)}%`}
              </div>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">
              Diferença (V - C)
            </div>
            <div
              className={`text-sm font-semibold ${diff > 0 ? "text-green-500" : diff < 0 ? "text-red-400" : ""}`}
            >
              {composite ? fmt(diff) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase opacity-60 tracking-wide">
              Compras / Vendas
            </div>
            <div className="text-sm font-semibold">
              {ratio == null ? "—" : `${ratio.toFixed(1)}%`}
            </div>
          </div>
          <div className="pt-2 border-t text-[11px] opacity-70 leading-snug">
            Sobrepõe séries mensais de receita (vendas) e compras. MoM calculado
            contra mês anterior.
          </div>
        </div>
      </div>
      <div className="text-xs opacity-70">
        Valores baseados em total_liquido + frete_total (vendas) e somatório
        equivalente para compras.
      </div>
    </div>
  );
}
