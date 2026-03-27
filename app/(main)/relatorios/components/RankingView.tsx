"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { formatBrl } from "./shared/utils";
import { ChartCard } from "./shared/ChartCard";
import { KPICard } from "./shared/KPICard";
import { ViewModeToggle, type ViewMode } from "./shared/ViewModeToggle";

export interface RankingViewProps {
  ranking: Array<Record<string, unknown>>;
  totalGeral?: number;
  totalPedidosGeral?: number;
  ticketMedioGeral?: number;
  rankingAnterior?: { totalGeral: number } | null;
  tipo: "vendas" | "fornecedores";
  // eslint-disable-next-line no-unused-vars -- callback type: param required by signature
  onTipoChange: (tipo: "vendas" | "fornecedores") => void;
  mes: number;
  ano: number;
}

export function RankingView({ ranking, totalGeral, totalPedidosGeral, ticketMedioGeral, rankingAnterior, tipo, onTipoChange, mes, ano }: RankingViewProps) {
  const titulo =
    tipo === "vendas" ? "Ranking de Vendas (Casa de Ração + Cliente Final)" : "Ranking de Fornecedores";
  const colLabel = tipo === "vendas" ? "Comprador" : "Fornecedor";

  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const topRanking = useMemo(
    () =>
      ranking.slice(0, 10).map((r) => ({
        nome: String(r.nome || "").slice(0, 25),
        total: Number(r.total || 0),
        participacao: totalGeral && totalGeral > 0 ? Number((Number(r.total || 0) / totalGeral * 100).toFixed(1)) : 0,
      })),
    [ranking, totalGeral],
  );
  const totalTop10 = ranking.slice(0, 10).reduce((s, r) => s + Number(r.total || 0), 0);
  const concentracaoTop10 = totalGeral && totalGeral > 0 ? ((totalTop10 / totalGeral) * 100).toFixed(1) : null;

  const pieData = useMemo(() => {
    if (topRanking.length === 0 || !totalGeral || totalGeral <= 0) return [];
    const outrosTotal = totalGeral - totalTop10;
    const slices = topRanking.map((r) => ({
      name: r.nome || "Sem nome",
      value: Number(r.total || 0),
      pct: Number(r.participacao || 0),
    }));
    if (outrosTotal > 0) {
      slices.push({
        name: "Outros",
        value: outrosTotal,
        pct: Number(((outrosTotal / totalGeral) * 100).toFixed(1)),
      });
    }
    return slices;
  }, [topRanking, totalGeral, totalTop10]);

  const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1", "#94a3b8"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        <div className="flex items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <span className="text-sm text-[var(--color-text-secondary)]">Exibir:</span>
          <div className="flex rounded border border-[var(--color-border)] p-0.5">
            <button
              type="button"
              onClick={() => onTipoChange("vendas")}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                tipo === "vendas"
                  ? "bg-[var(--color-accent)] text-white"
                  : "hover:bg-[var(--color-bg-secondary)]"
              }`}
            >
              Vendas (compradores)
            </button>
            <button
              type="button"
              onClick={() => onTipoChange("fornecedores")}
              className={`rounded px-3 py-1 text-sm font-medium transition ${
                tipo === "fornecedores"
                  ? "bg-[var(--color-accent)] text-white"
                  : "hover:bg-[var(--color-bg-secondary)]"
              }`}
            >
              Fornecedores
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {tipo === "vendas" && totalGeral != null && (
          <KPICard
            label="Total vendas (período)"
            value={formatBrl(totalGeral)}
            subtitle={totalPedidosGeral ? `${totalPedidosGeral} pedidos` : undefined}
          />
        )}
        {tipo === "vendas" && ticketMedioGeral != null && ticketMedioGeral > 0 && (
          <KPICard label="Ticket médio geral" value={formatBrl(ticketMedioGeral)} />
        )}
        {tipo === "vendas" && concentracaoTop10 && (
          <KPICard
            label="Top 10 = % do total"
            value={`${concentracaoTop10}%`}
            subtitle={`${formatBrl(totalTop10)} de ${formatBrl(totalGeral || 0)}`}
          />
        )}
        {tipo === "vendas" && rankingAnterior && totalGeral != null && rankingAnterior.totalGeral > 0 && (
          <KPICard
            label="Crescimento vs ano anterior"
            value={`${(((totalGeral - rankingAnterior.totalGeral) / rankingAnterior.totalGeral) * 100).toFixed(1)}%`}
            subtitle={`${formatBrl(totalGeral)} vs ${formatBrl(rankingAnterior.totalGeral)}`}
          />
        )}
        <KPICard
          label="Total Top 1"
          value={topRanking[0] ? formatBrl(topRanking[0].total) : "-"}
        />
        <KPICard
          label="Média Top 10"
          value={
            topRanking.length > 0
              ? formatBrl(
                  topRanking.reduce((s, r) => s + r.total, 0) / topRanking.length,
                )
              : "-"
          }
        />
      </div>

      {topRanking.length > 0 && (viewMode === "chart" || viewMode === "both") && (
        <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Top 10 por total"
          exportFilename={`ranking-${tipo}-${mes}-${ano}`}
        >
          <ResponsiveContainer width="100%" height={Math.min(350, topRanking.length * 32 + 40)}>
            <BarChart
              data={topRanking}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis type="number" tickFormatter={(v) => formatBrl(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => formatBrl(v)} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="total" name="Total" fill="#3b82f6" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        {pieData.length > 0 && tipo === "vendas" && (
          <ChartCard
            title="Participação % nas vendas por comprador"
            exportFilename={`ranking-pizza-${tipo}-${mes}-${ano}`}
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props) => {
                    const p = props as { name?: string; payload?: { pct?: number } };
                    return `${p.name ?? ""}: ${p.payload?.pct ?? 0}%`;
                  }}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBrl(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
        </div>
      )}

      {(viewMode === "table" || viewMode === "both") && (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="py-2 text-left">#</th>
              <th className="py-2 text-left">{colLabel}</th>
              <th className="py-2 text-right">Pedidos</th>
              <th className="py-2 text-right">Total</th>
              {tipo === "vendas" && <th className="py-2 text-right">% Total</th>}
              {tipo === "vendas" && <th className="py-2 text-right">Ticket médio</th>}
              {tipo === "vendas" && <th className="py-2 text-right">Margem %</th>}
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr key={String(r.entity_id)} className="border-b border-[var(--color-border)]">
                <td className="py-2">{i + 1}</td>
                <td className="py-2">{String(r.nome)}</td>
                <td className="py-2 text-right">{Number(r.pedidos_count || 0)}</td>
                <td className="py-2 text-right">{formatBrl(Number(r.total || 0))}</td>
                {tipo === "vendas" && (
                  <td className="py-2 text-right">
                    {totalGeral && totalGeral > 0
                      ? `${((Number(r.total || 0) / totalGeral) * 100).toFixed(1)}%`
                      : Number(r.participacaoTotal) != null
                        ? `${Number(r.participacaoTotal).toFixed(1)}%`
                        : "-"}
                  </td>
                )}
                {tipo === "vendas" && (
                  <td className="py-2 text-right">{formatBrl(Number(r.ticketMedio ?? 0))}</td>
                )}
                {tipo === "vendas" && (
                  <td className="py-2 text-right">
                    {r.margemBruta != null ? `${Number(r.margemBruta).toFixed(1)}%` : "N/D"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {tipo === "vendas" && totalGeral != null && (
            <tfoot>
              <tr className="border-t border-[var(--color-border)] font-medium text-[var(--color-text-secondary)]">
                <td className="py-2" colSpan={2}>Top 10 representam {concentracaoTop10 ?? "0"}% do total</td>
                <td className="py-2 text-right">{formatBrl(totalTop10)}</td>
                <td className="py-2 text-right" colSpan={3} />
              </tr>
              <tr className="border-t-2 border-[var(--color-border)] font-semibold">
                <td className="py-2" colSpan={2}>Total geral</td>
                <td className="py-2 text-right">{totalPedidosGeral ?? ranking.reduce((s, r) => s + Number(r.pedidos_count || 0), 0)}</td>
                <td className="py-2 text-right">{formatBrl(totalGeral)}</td>
                <td className="py-2 text-right">100%</td>
                <td className="py-2 text-right">{ticketMedioGeral ? formatBrl(ticketMedioGeral) : "-"}</td>
                <td className="py-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      )}
    </div>
  );
}
