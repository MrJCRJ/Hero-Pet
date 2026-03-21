"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { formatBrl } from "./shared/utils";
import { ChartCard } from "./shared/ChartCard";
import { KPICard } from "./shared/KPICard";
import { ViewModeToggle, type ViewMode } from "./shared/ViewModeToggle";

export interface MargemViewProps {
  itens: Array<Record<string, unknown>>;
  totalReceita?: number;
  margemAnterior?: { totalReceita: number; lucroTotal: number } | null;
  mes: number;
  ano: number;
}

function getColorByMargin(margem: number) {
  if (margem >= 30) return "#22c55e";
  if (margem >= 15) return "#eab308";
  return "#ef4444";
}

type SortMargem = "desc" | "asc";

export function MargemView({ itens, totalReceita: totalReceitaProp, margemAnterior, mes, ano }: MargemViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [sortMargem, setSortMargem] = useState<SortMargem>("desc");
  const totalReceita = totalReceitaProp ?? itens.reduce((s, i) => s + Number(i.receita || 0), 0);
  const itensOrdenados = useMemo(
    () =>
      [...itens].sort((a, b) => {
        const ma = Number(a.margem || 0);
        const mb = Number(b.margem || 0);
        return sortMargem === "desc" ? mb - ma : ma - mb;
      }),
    [itens, sortMargem],
  );
  const topProducts = useMemo(
    () =>
      itensOrdenados
        .slice(0, 15)
        .map((item) => ({
          nome: String(item.nome || "").slice(0, 30),
          margem: Number(item.margem || 0),
          lucro: Number(item.lucro || 0),
          participacao: Number(item.participacaoVendas || 0),
        })),
    [itensOrdenados],
  );

  const pieParticipacao = useMemo(() => {
    if (totalReceita <= 0 || itens.length === 0) return [];
    const top15 = itensOrdenados.slice(0, 15);
    const totalTop15 = top15.reduce((s, i) => s + Number(i.receita || 0), 0);
    const outros = totalReceita - totalTop15;
    const slices = top15.map((i) => ({
      name: String(i.nome || "").slice(0, 20),
      value: Number(i.receita || 0),
      pct: Number(((Number(i.receita || 0) / totalReceita) * 100).toFixed(1)),
    }));
    if (outros > 0) {
      slices.push({ name: "Outros", value: outros, pct: Number(((outros / totalReceita) * 100).toFixed(1)) });
    }
    return slices;
  }, [itensOrdenados, totalReceita]);

  const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1", "#14b8a6", "#a855f7", "#e11d48", "#0d9488", "#7c3aed", "#94a3b8"];

  const margemMediaPonderada =
    itens.length > 0
      ? itens.reduce((acc, i) => {
          const rec = Number(i.receita || 0);
          const marg = Number(i.margem || 0);
          return acc + (rec > 0 ? (marg * rec) : 0);
        }, 0) /
        Math.max(
          1,
          itens.reduce((acc, i) => acc + Number(i.receita || 0), 0),
        )
      : 0;
  const maiorMargem = topProducts[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Margem por Produto</h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[var(--color-text-secondary)]">Ordenar margem:</span>
          <div className="flex rounded border border-[var(--color-border)] p-0.5">
            <button
              type="button"
              onClick={() => setSortMargem("desc")}
              className={`rounded px-2 py-1 text-sm ${sortMargem === "desc" ? "bg-[var(--color-accent)] text-white" : "hover:bg-[var(--color-bg-secondary)]"}`}
            >
              Maior →
            </button>
            <button
              type="button"
              onClick={() => setSortMargem("asc")}
              className={`rounded px-2 py-1 text-sm ${sortMargem === "asc" ? "bg-[var(--color-accent)] text-white" : "hover:bg-[var(--color-bg-secondary)]"}`}
            >
              Menor
            </button>
          </div>
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <KPICard label="Total vendas" value={formatBrl(totalReceita)} />
        {margemAnterior && margemAnterior.totalReceita > 0 && (
          <KPICard
            label="Crescimento vendas vs ano anterior"
            value={`${(((totalReceita - margemAnterior.totalReceita) / margemAnterior.totalReceita) * 100).toFixed(1)}%`}
            subtitle={`${formatBrl(totalReceita)} vs ${formatBrl(margemAnterior.totalReceita)}`}
          />
        )}
        <KPICard label="Margem média ponderada" value={`${margemMediaPonderada.toFixed(1)}%`} />
        <KPICard
          label="Produto com maior margem"
          value={maiorMargem ? String(maiorMargem.nome) : "-"}
          subtitle={maiorMargem ? `${maiorMargem.margem.toFixed(1)}%` : undefined}
        />
      </div>

      {topProducts.length > 0 && (viewMode === "chart" || viewMode === "both") && (
        <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
        title="Top 15 produtos por margem %"
        exportFilename={`margem-${mes}-${ano}`}
      >
          <ResponsiveContainer width="100%" height={Math.min(400, topProducts.length * 28 + 40)}>
            <BarChart
              data={topProducts}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: number) => `${Number(v).toFixed(1)}%`}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="margem" name="Margem" isAnimationActive={false}>
                {topProducts.map((entry, i) => (
                  <Cell key={i} fill={getColorByMargin(entry.margem)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        {pieParticipacao.length > 0 && (
          <ChartCard
            title="Participação % nas vendas por produto"
            exportFilename={`margem-pizza-${mes}-${ano}`}
          >
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieParticipacao}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, pct }) => `${name}: ${pct}%`}
                  labelLine={false}
                >
                  {pieParticipacao.map((_, i) => (
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
              <th className="py-2 text-left">Produto</th>
              <th className="py-2 text-left">Categoria</th>
              <th className="py-2 text-right">Receita</th>
              <th className="py-2 text-right">% Vendas</th>
              <th className="py-2 text-right">Custos</th>
              <th className="py-2 text-right">Lucro</th>
              <th className="py-2 text-right">Margem %</th>
              <th className="py-2 text-right">Marg. unit.</th>
            </tr>
          </thead>
          <tbody>
            {itensOrdenados.map((item) => (
              <tr key={String(item.produto_id)} className="border-b border-[var(--color-border)]">
                <td className="py-2">{String(item.nome)}</td>
                <td className="py-2">{String(item.categoria || "-")}</td>
                <td className="py-2 text-right">{formatBrl(Number(item.receita || 0))}</td>
                <td className="py-2 text-right">{Number(item.participacaoVendas ?? (totalReceita > 0 ? (Number(item.receita || 0) / totalReceita) * 100 : 0)).toFixed(1)}%</td>
                <td className="py-2 text-right">{formatBrl(Number(item.cogs || 0))}</td>
                <td className="py-2 text-right">{formatBrl(Number(item.lucro || 0))}</td>
                <td className="py-2 text-right">{Number(item.margem || 0).toFixed(1)}%</td>
                <td className="py-2 text-right">{formatBrl(Number(item.margemContribuicaoUnit ?? 0))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[var(--color-border)] font-semibold">
              <td className="py-2" colSpan={2}>Total</td>
              <td className="py-2 text-right">{formatBrl(totalReceita)}</td>
              <td className="py-2 text-right">100%</td>
              <td className="py-2 text-right">{formatBrl(itens.reduce((s, i) => s + Number(i.cogs || 0), 0))}</td>
              <td className="py-2 text-right">{formatBrl(itens.reduce((s, i) => s + Number(i.lucro || 0), 0))}</td>
              <td className="py-2 text-right">{totalReceita > 0 ? `${((itens.reduce((s, i) => s + Number(i.lucro || 0), 0) / totalReceita) * 100).toFixed(1)}%` : "-"}</td>
              <td className="py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
      )}
    </div>
  );
}
