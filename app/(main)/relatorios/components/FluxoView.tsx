"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import { HelpCircle } from "lucide-react";
import { formatBrl } from "./shared/utils";
import { ChartCard } from "./shared/ChartCard";
import { KPICard } from "./shared/KPICard";
import { ViewModeToggle, type ViewMode } from "./shared/ViewModeToggle";

export interface FluxoViewProps {
  fluxo: Record<string, unknown>;
  mes: number;
  ano: number;
}

export function FluxoView({ fluxo, mes, ano }: FluxoViewProps) {
  const entradas = fluxo.entradas as Record<string, number>;
  const saidas = fluxo.saidas as Record<string, number>;
  const saldo = fluxo.saldo as number;
  const saldoInicial = (fluxo.saldoInicial as number) ?? 0;
  const saldoFinal = (fluxo.saldoFinal as number) ?? saldo;
  const fluxoOperacional = (fluxo.fluxoOperacional as number) ?? saldo;
  const fluxoFinanciamento = (fluxo.fluxoFinanciamento as number) ?? 0;
  const fluxoInvestimento = (fluxo.fluxoInvestimento as number) ?? 0;
  const valorEstoque = (fluxo.valorEstoque as number) ?? 0;
  const valorPresumidoVendaEstoque = (fluxo.valorPresumidoVendaEstoque as number) ?? 0;
  const evolucaoMensalRaw = fluxo.evolucaoMensal as Array<{ mes: string; entradas: number; saidas: number; saldoPeriodo: number; saldoAcumulado: number }> | undefined;

  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const chartData = useMemo(
    () => [
      {
        name: "Período",
        entradas: entradas?.total ?? 0,
        saidas: saidas?.total ?? 0,
      },
    ],
    [entradas?.total, saidas?.total],
  );

  const evolucaoChartData = useMemo(
    () =>
      (evolucaoMensalRaw ?? []).map((m) => ({
        mes: m.mes,
        entradas: m.entradas,
        saidas: m.saidas,
        saldoPeriodo: m.saldoPeriodo,
        saldoAcumulado: m.saldoAcumulado,
      })),
    [evolucaoMensalRaw],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Fluxo de Caixa</h2>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KPICard
          label="Saldo inicial"
          value={formatBrl(saldoInicial)}
          subtitle="Acumulado até início do período"
        />
        <KPICard
          label="Saldo final"
          value={formatBrl(saldoFinal)}
          subtitle={saldo >= 0 ? "Positivo" : "Negativo"}
        />
        <KPICard label="Total entradas" value={formatBrl(entradas?.total || 0)} />
        <KPICard label="Total saídas" value={formatBrl(saidas?.total || 0)} />
        <KPICard
          label="Valor em estoque"
          value={formatBrl(valorEstoque)}
          subtitle="Custo médio × saldo"
        />
        <KPICard
          label="Valor presumido venda"
          value={formatBrl(valorPresumidoVendaEstoque)}
          subtitle="Preço tabela ou custo+markup × saldo"
        />
      </div>

      {(fluxoOperacional !== 0 || fluxoFinanciamento !== 0 || fluxoInvestimento !== 0) && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
            Fluxos por natureza
          </h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-[var(--color-text-secondary)]">Operacional: </span>
              <span className={fluxoOperacional >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {formatBrl(fluxoOperacional)}
              </span>
              <span className="ml-1 text-xs text-[var(--color-text-secondary)]">(vendas + promissórias - compras - despesas)</span>
            </div>
            <div>
              <span className="text-[var(--color-text-secondary)]">Financiamento: </span>
              <span className={fluxoFinanciamento >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                {formatBrl(fluxoFinanciamento)}
              </span>
              <span className="ml-1 text-xs text-[var(--color-text-secondary)]">(aportes de capital)</span>
            </div>
            {fluxoInvestimento !== 0 && (
              <div>
                <span className="text-[var(--color-text-secondary)]">Investimento: </span>
                <span className={fluxoInvestimento >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                  {formatBrl(fluxoInvestimento)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {(viewMode === "chart" || viewMode === "both") && (
        <>
          <ChartCard
            title="Entradas vs Saídas"
            exportFilename={`fluxo-${mes}-${ano}`}
          >
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => formatBrl(v)} tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: number) => formatBrl(v)} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="entradas" name="Entradas" fill="#22c55e" />
                <Bar dataKey="saidas" name="Saídas" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          {evolucaoChartData.length > 0 && (
            <ChartCard
              title="Evolução mensal do caixa"
              exportFilename={`fluxo-evolucao-${mes}-${ano}`}
            >
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={evolucaoChartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tickFormatter={(v) => formatBrl(v)} tick={{ fontSize: 10 }} width={80} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatBrl(v)} tick={{ fontSize: 10 }} width={80} />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      ["entradas", "saidas", "saldoPeriodo", "saldoAcumulado"].includes(name)
                        ? formatBrl(v)
                        : v
                    }
                    labelFormatter={(label) => `Mês: ${label}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar yAxisId="left" dataKey="entradas" name="Entradas" fill="#22c55e" radius={[2, 2, 0, 0]} />
                  <Bar yAxisId="left" dataKey="saidas" name="Saídas" fill="#ef4444" radius={[2, 2, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="saldoAcumulado" name="Saldo acumulado" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </>
      )}
      {(viewMode === "table" || viewMode === "both") && (
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 font-medium text-green-600 dark:text-green-400">Entradas</h3>
          <p className="mb-2 text-xs text-[var(--color-text-secondary)]">
            Vendas à vista. Parceladas entram em Promissórias recebidas.
          </p>
          <ul className="space-y-1 text-sm">
            <li className="flex items-center gap-1">
              Vendas:
              <span
                title="Vendas à vista – vendas parceladas são registradas em Promissórias recebidas quando pagas."
                aria-label="Vendas à vista – vendas parceladas são registradas em Promissórias recebidas quando pagas."
                className="cursor-help text-[var(--color-text-secondary)]"
              >
                <HelpCircle className="inline h-3.5 w-3.5" />
              </span>
              {" "}{formatBrl(entradas?.vendas || 0)}
            </li>
            <li>Promissórias recebidas: {formatBrl(entradas?.promissoriasRecebidas || 0)}</li>
            {(entradas?.aportesCapital ?? 0) > 0 && (
              <li>Aportes de capital: {formatBrl(entradas?.aportesCapital || 0)}</li>
            )}
            <li className="font-medium">Total: {formatBrl(entradas?.total || 0)}</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-2 font-medium text-red-600 dark:text-red-400">Saídas</h3>
          <ul className="space-y-1 text-sm">
            <li>Compras: {formatBrl(saidas?.compras || 0)}</li>
            <li>Despesas: {formatBrl(saidas?.despesas || 0)}</li>
            <li className="font-medium">Total: {formatBrl(saidas?.total || 0)}</li>
          </ul>
        </div>
      </div>
      )}
      <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
        <p className={`text-lg font-bold ${saldo >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          Saldo do período: {formatBrl(saldo)}
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-secondary)]">
          <span>Valor em estoque (custo): {formatBrl(valorEstoque)}</span>
          <span>Valor presumido de venda do estoque: {formatBrl(valorPresumidoVendaEstoque)}</span>
        </div>
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          <strong>Reconciliação com DRE:</strong> O fluxo de caixa registra vendas quando o dinheiro entra (à vista ou promissórias pagas). O DRE contabiliza vendas na emissão. Vendas a prazo distorcem a relação entre faturamento e caixa.
        </p>
      </div>
    </div>
  );
}
