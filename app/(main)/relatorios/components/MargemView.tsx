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
} from "recharts";
import { formatBrl } from "./shared/utils";
import { ChartCard } from "./shared/ChartCard";
import { KPICard } from "./shared/KPICard";
import { ViewModeToggle, type ViewMode } from "./shared/ViewModeToggle";

export interface MargemViewProps {
  itens: Array<Record<string, unknown>>;
  mes: number;
  ano: number;
}

function getColorByMargin(margem: number) {
  if (margem >= 30) return "#22c55e";
  if (margem >= 15) return "#eab308";
  return "#ef4444";
}

export function MargemView({ itens, mes, ano }: MargemViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const topProducts = useMemo(
    () =>
      [...itens]
        .sort((a, b) => Number(b.margem || 0) - Number(a.margem || 0))
        .slice(0, 15)
        .map((item) => ({
          nome: String(item.nome || "").slice(0, 30),
          margem: Number(item.margem || 0),
          lucro: Number(item.lucro || 0),
        })),
    [itens],
  );

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
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KPICard label="Margem média ponderada" value={`${margemMediaPonderada.toFixed(1)}%`} />
        <KPICard
          label="Produto com maior margem"
          value={maiorMargem ? String(maiorMargem.nome) : "-"}
          subtitle={maiorMargem ? `${maiorMargem.margem.toFixed(1)}%` : undefined}
        />
      </div>

      {topProducts.length > 0 && (viewMode === "chart" || viewMode === "both") && (
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
      )}
      {(viewMode === "table" || viewMode === "both") && (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="py-2 text-left">Produto</th>
              <th className="py-2 text-left">Categoria</th>
              <th className="py-2 text-right">Receita</th>
              <th className="py-2 text-right">Custos</th>
              <th className="py-2 text-right">Lucro</th>
              <th className="py-2 text-right">Margem %</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={String(item.produto_id)} className="border-b border-[var(--color-border)]">
                <td className="py-2">{String(item.nome)}</td>
                <td className="py-2">{String(item.categoria || "-")}</td>
                <td className="py-2 text-right">{formatBrl(Number(item.receita || 0))}</td>
                <td className="py-2 text-right">{formatBrl(Number(item.cogs || 0))}</td>
                <td className="py-2 text-right">{formatBrl(Number(item.lucro || 0))}</td>
                <td className="py-2 text-right">{Number(item.margem || 0).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}
