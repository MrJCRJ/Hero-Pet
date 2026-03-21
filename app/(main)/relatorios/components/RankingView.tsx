"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
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
  tipo: "vendas" | "fornecedores";
  // eslint-disable-next-line no-unused-vars -- callback type: param required by signature
  onTipoChange: (tipo: "vendas" | "fornecedores") => void;
  mes: number;
  ano: number;
}

export function RankingView({ ranking, totalGeral, totalPedidosGeral, ticketMedioGeral, tipo, onTipoChange, mes, ano }: RankingViewProps) {
  const titulo =
    tipo === "vendas" ? "Ranking de Vendas (clientes)" : "Ranking de Fornecedores";
  const colLabel = tipo === "vendas" ? "Cliente" : "Fornecedor";

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
              Vendas (clientes)
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
                  <td className="py-2 text-right">{Number(r.margemBruta ?? 0).toFixed(1)}%</td>
                )}
              </tr>
            ))}
          </tbody>
          {tipo === "vendas" && totalGeral != null && (
            <tfoot>
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
