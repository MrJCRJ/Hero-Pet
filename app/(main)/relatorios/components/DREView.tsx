"use client";

import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { formatBrl } from "./shared/utils";
import { ChartCard } from "./shared/ChartCard";
import { KPICard } from "./shared/KPICard";
import { ViewModeToggle, type ViewMode } from "./shared/ViewModeToggle";

const DRE_LINHAS = [
  { key: "receitas", label: "Receitas (vendas)", tooltip: "Soma do total líquido + frete dos pedidos de venda confirmados no período.", explain: "Todas as vendas realizadas no período, considerando descontos e fretes." },
  { key: "custosVendas", label: "(-) Custos (COGS)", tooltip: "Custo dos produtos vendidos (COGS = Cost of Goods Sold).", explain: "Custo real dos produtos que foram vendidos, calculado com base no método FIFO." },
  { key: "lucroBruto", label: "Lucro bruto", tooltip: "Receitas menos custos das vendas. A margem bruta é (lucro bruto / receitas) x 100.", explain: "O que sobra das vendas após pagar o custo dos produtos. A margem indica a eficiência da operação." },
  { key: "despesas", label: "(-) Despesas", tooltip: "Despesas operacionais lançadas no período (data de vencimento).", explain: "Gastos fixos e variáveis: aluguel, salários, utilities, etc." },
  { key: "lucroOperacional", label: "Lucro operacional", tooltip: "Lucro bruto menos despesas. Indica o resultado da operação antes de impostos e financeiro.", explain: "Resultado final da operação do negócio no período." },
] as const;

export interface DREViewProps {
  dre: Record<string, number>;
  dreAnterior?: Record<string, number> | null;
  mes: number;
  ano: number;
}

export function DREView({ dre, dreAnterior, mes, ano }: DREViewProps) {
  const [expandido, setExpandido] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("both");

  const chartData = useMemo(
    () => [
      {
        name: "Período",
        receitas: dre.receitas ?? 0,
        custos: -(dre.custosVendas ?? 0),
        despesas: -(dre.despesas ?? 0),
      },
    ],
    [dre.receitas, dre.custosVendas, dre.despesas],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">DRE - Demonstração do Resultado</h2>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KPICard label="Receita total" value={formatBrl(dre.receitas ?? 0)} />
        <KPICard
          label="Lucro operacional"
          value={formatBrl(dre.lucroOperacional ?? 0)}
          subtitle={`Margem ${(dre.margemOperacional ?? 0).toFixed(1)}%`}
        />
        <KPICard label="Margem bruta" value={`${(dre.margemBruta ?? 0).toFixed(1)}%`} />
      </div>

      {(viewMode === "chart" || viewMode === "both") && (
      <ChartCard
        title="Composição (Receitas vs Custos vs Despesas)"
        exportFilename={`dre-${mes}-${ano}`}
      >
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={(v) => formatBrl(v)} tick={{ fontSize: 11 }} width={90} />
            <Tooltip
              formatter={(v: number) => formatBrl(Math.abs(v))}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="receitas" name="Receitas" fill="#22c55e" stackId="a" />
            <Bar dataKey="custos" name="Custos (COGS)" fill="#ef4444" stackId="a" />
            <Bar dataKey="despesas" name="Despesas" fill="#f97316" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      )}
      {(viewMode === "table" || viewMode === "both") && (
      <table className="w-full text-sm">
        <tbody>
          {DRE_LINHAS.map(({ key, label, tooltip }) => {
            const valor = dre[key as keyof typeof dre] ?? 0;
            const neg = key === "custosVendas" || key === "despesas";
            const destaque = key === "lucroBruto" || key === "lucroOperacional";
            const extra = key === "lucroBruto" ? ` (${dre.margemBruta ?? 0}%)` : key === "lucroOperacional" ? ` (${dre.margemOperacional ?? 0}%)` : "";
            const anterior = dreAnterior?.[key as keyof typeof dreAnterior];
            const variacao = anterior != null && anterior !== 0 ? (((valor - anterior) / anterior) * 100).toFixed(1) : null;
            const variacaoLabel = variacao != null ? ` (${Number(variacao) >= 0 ? "+" : ""}${variacao}% vs mês ant.)` : "";
            const corVariacao = key === "receitas" || key === "lucroBruto" || key === "lucroOperacional"
              ? (Number(variacao) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
              : key === "custosVendas" || key === "despesas"
                ? (Number(variacao) <= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")
                : "text-[var(--color-text-secondary)]";
            return (
              <tr key={key} className={`border-b border-[var(--color-border)] ${destaque ? "font-medium" : ""}`}>
                <td className={`py-2 ${key === "custosVendas" || key === "despesas" ? "pl-4 text-[var(--color-text-secondary)]" : "font-medium"}`}>
                  <span className="inline-flex items-center gap-1">
                    {label}
                    <span className="inline-flex cursor-help text-[var(--color-text-secondary)]" title={tooltip} aria-label={tooltip}>
                      <HelpCircle className="h-3.5 w-3.5" />
                    </span>
                  </span>
                </td>
                <td className={`text-right ${neg ? "text-red-600 dark:text-red-400" : ""}`}>
                  {neg ? "-" : ""}{formatBrl(valor)}{extra}
                  {variacaoLabel && <span className={`ml-1 text-xs ${corVariacao}`}>{variacaoLabel}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      )}
      <details className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)]" open={expandido} onToggle={(e) => setExpandido((e.target as HTMLDetailsElement).open)}>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm font-medium">
          {expandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          O que significa cada linha?
        </summary>
        <ul className="space-y-2 border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          {DRE_LINHAS.map(({ label, explain }) => (
            <li key={label}><strong className="text-[var(--color-text-primary)]">{label}:</strong> {explain}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
