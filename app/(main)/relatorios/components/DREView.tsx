"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { HelpCircle, ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
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

const CHART_COLORS = {
  receitas: "#22c55e",
  custos: "#ef4444",
  despesas: "#f97316",
  lucroBruto: "#3b82f6",
  lucroOperacional: "#8b5cf6",
};

export interface DREViewProps {
  dre: Record<string, number>;
  dreAnterior?: Record<string, number> | null;
  mes: number;
  ano: number;
  /** JSON consolidado (mesma fonte do download): indicadores derivados, YoY, médias móveis. */
  consolidadoJson?: Record<string, unknown> | null;
}

function VariacaoBadge({
  variacao,
  tipo,
}: { variacao: number; tipo: "receita" | "custo" }) {
  const isPositive = tipo === "receita" ? variacao >= 0 : variacao <= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      <Icon className="h-3 w-3" />
      {variacao >= 0 ? "+" : ""}{variacao.toFixed(1)}%
    </span>
  );
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function DREView({ dre, dreAnterior, mes, ano, consolidadoJson }: DREViewProps) {
  const [expandido, setExpandido] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [indicadores, setIndicadores] = useState<{
    pmr: { valor: number | null };
    pmp: { valor: number | null };
    giroEstoque: { valor: number | null };
    dve: { valor: number | null };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/relatorios/indicadores?mes=${mes}&ano=${ano}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.indicadores) setIndicadores(data.indicadores);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [mes, ano]);

  const receitas = dre.receitas ?? 0;
  const custosVendas = dre.custosVendas ?? 0;
  const lucroBruto = dre.lucroBruto ?? 0;
  const despesas = dre.despesas ?? 0;
  const lucroOperacional = dre.lucroOperacional ?? 0;
  const margemBruta = dre.margemBruta ?? 0;
  const margemOperacional = dre.margemOperacional ?? 0;

  const periodoLabel =
    ano === 0
      ? "Últimos 12 meses"
      : mes === 0 || !mes
        ? `Ano ${ano} (todos os meses)`
        : `${new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "long" })}/${ano}`;

  const composicaoData = useMemo(() => {
    if (receitas <= 0) return null;
    const pctCustos = (custosVendas / receitas) * 100;
    const pctDespesas = (despesas / receitas) * 100;
    const pctLucroOp = (lucroOperacional / receitas) * 100;
    return [
      { name: "Custos (COGS)", value: custosVendas, pct: pctCustos, fill: CHART_COLORS.custos },
      { name: "Despesas", value: despesas, pct: pctDespesas, fill: CHART_COLORS.despesas },
      {
        name: "Lucro operacional",
        value: lucroOperacional,
        pct: pctLucroOp,
        fill: CHART_COLORS.lucroOperacional,
      },
    ].filter((d) => d.value > 0);
  }, [receitas, custosVendas, despesas, lucroOperacional]);

  const pieData = useMemo(() => {
    if (receitas <= 0) return [];
    return [
      { name: "Lucro bruto", value: Math.max(0, lucroBruto), color: CHART_COLORS.lucroBruto },
      { name: "Custos (COGS)", value: custosVendas, color: CHART_COLORS.custos },
      { name: "Despesas", value: despesas, color: CHART_COLORS.despesas },
    ].filter((d) => d.value > 0);
  }, [receitas, lucroBruto, custosVendas, despesas]);

  const waterfallSteps = useMemo(
    () => [
      { label: "Receitas", valor: receitas, tipo: "entrada" as const },
      { label: "(-) Custos", valor: -custosVendas, tipo: "saida" as const },
      { label: "Lucro bruto", valor: lucroBruto, tipo: "resultado" as const },
      { label: "(-) Despesas", valor: -despesas, tipo: "saida" as const },
      { label: "Lucro operacional", valor: lucroOperacional, tipo: "resultado" as const },
    ],
    [receitas, custosVendas, lucroBruto, despesas, lucroOperacional],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            DRE — Demonstração do Resultado
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">{periodoLabel}</p>
        </div>
        <ViewModeToggle value={viewMode} onChange={setViewMode} />
      </div>

      {/* KPIs em destaque */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KPICard
          label="Receita total"
          value={formatBrl(receitas)}
          subtitle={
            dreAnterior?.receitas && dreAnterior.receitas !== 0 ? (
              <VariacaoBadge
                variacao={((receitas - dreAnterior.receitas) / dreAnterior.receitas) * 100}
                tipo="receita"
              />
            ) : undefined
          }
        />
        <KPICard
          label="Lucro bruto"
          value={formatBrl(lucroBruto)}
          subtitle={`Margem ${margemBruta.toFixed(1)}%`}
        />
        <KPICard
          label="Margem bruta"
          value={`${margemBruta.toFixed(1)}%`}
        />
        <KPICard
          label="Despesas"
          value={formatBrl(despesas)}
        />
        <KPICard
          label="Lucro operacional"
          value={formatBrl(lucroOperacional)}
          subtitle={`Margem ${margemOperacional.toFixed(1)}%`}
        />
        <KPICard
          label="Despesas / Receita"
          value={`${Number(dre.despesasSobreReceita ?? (receitas > 0 ? (despesas / receitas) * 100 : 0)).toFixed(1)}%`}
          subtitle="Indicador de eficiência"
        />
      </div>

      {indicadores && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
          <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">
            Indicadores gerenciais
          </h3>
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
            PMR e PMP relacionam saldo médio de títulos (a receber / a pagar) com vendas ou compras do período
            selecionado. Se vendas ou compras forem baixas e os saldos em aberto forem altos, os prazos podem
            ficar muito elevados. O giro usa COGS sobre valor de estoque atual; o sufixo “×/ano” é uma
            convenção de exibição.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">PMR (prazo médio recebimento)</p>
              <p className="font-mono font-medium">
                {indicadores.pmr.valor != null ? `${indicadores.pmr.valor} dias` : "N/D"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">PMP (prazo médio pagamento)</p>
              <p className="font-mono font-medium">
                {indicadores.pmp.valor != null ? `${indicadores.pmp.valor} dias` : "N/D"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Giro de estoque</p>
              <p className="font-mono font-medium">
                {indicadores.giroEstoque.valor != null ? `${indicadores.giroEstoque.valor}×/ano` : "N/D"}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">DVE (dias venda em estoque)</p>
              <p className="font-mono font-medium">
                {indicadores.dve.valor != null ? `${indicadores.dve.valor} dias` : "N/D"}
              </p>
            </div>
          </div>
        </div>
      )}

      {consolidadoJson?.indicadores_derivados != null && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
          <h3 className="mb-1 text-sm font-semibold text-[var(--color-text-primary)]">
            Indicadores derivados (BI)
          </h3>
          <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
            Mesmos valores do arquivo JSON consolidado (schema 1.2). Ciclo de caixa: DVE + PMR − PMP. Giro de
            CR: vendas do período ÷ média de contas a receber (base do PMR).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Ciclo de conversão de caixa (dias)</p>
              <p className="font-mono font-medium">
                {(consolidadoJson.indicadores_derivados as Record<string, unknown>).ciclo_conversao_caixa_dias !=
                null
                  ? `${num((consolidadoJson.indicadores_derivados as Record<string, unknown>).ciclo_conversao_caixa_dias)} dias`
                  : "N/D"}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">DVE + PMR − PMP</p>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">Giro de contas a receber</p>
              <p className="font-mono font-medium">
                {(consolidadoJson.indicadores_derivados as Record<string, unknown>).giro_contas_receber != null
                  ? `${num((consolidadoJson.indicadores_derivados as Record<string, unknown>).giro_contas_receber)}×`
                  : "N/D"}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-secondary)]">
                vendas do período ÷ média de CR (mesma base do PMR)
              </p>
            </div>
          </div>
        </div>
      )}

      {consolidadoJson?.comparativo_interanual != null &&
        Array.isArray(
          (consolidadoJson.comparativo_interanual as Record<string, unknown>).meses
        ) &&
        ((consolidadoJson.comparativo_interanual as Record<string, unknown>).meses as unknown[]).length >
          0 && (
          <ChartCard
            title="Receita: período vs. ano anterior (mesma janela)"
            exportFilename={`dre-yoy-${mes}-${ano}`}
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={(
                  (consolidadoJson.comparativo_interanual as Record<string, unknown>).meses as Array<
                    Record<string, unknown>
                  >
                ).map((m) => ({
                  mes: String(m.mes ?? ""),
                  atual: num(m.receitas),
                  anoAnterior: num(m.receitas_ano_anterior),
                }))}
                margin={{ top: 5, right: 20, left: 8, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatBrl(v)} tick={{ fontSize: 10 }} width={72} />
                <Tooltip
                  formatter={(v: number) => formatBrl(v)}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="atual"
                  name="Receita"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="anoAnterior"
                  name="Ano anterior"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

      {consolidadoJson?.serie_dre_mensal != null &&
        Array.isArray(
          (consolidadoJson.serie_dre_mensal as Record<string, unknown>).meses_com_medias_moveis
        ) &&
        (
          (consolidadoJson.serie_dre_mensal as Record<string, unknown>).meses_com_medias_moveis as unknown[]
        ).length > 0 && (
          <ChartCard
            title="Receita e médias móveis (série mensal)"
            exportFilename={`dre-medias-${mes}-${ano}`}
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={(
                  (consolidadoJson.serie_dre_mensal as Record<string, unknown>)
                    .meses_com_medias_moveis as Array<Record<string, unknown>>
                ).map((m) => ({
                  mes: String(m.mes ?? ""),
                  receitas: num(m.receitas),
                  mm3: m.receita_media_movel_3 != null ? num(m.receita_media_movel_3) : null,
                  mm6: m.receita_media_movel_6 != null ? num(m.receita_media_movel_6) : null,
                }))}
                margin={{ top: 5, right: 20, left: 8, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatBrl(v)} tick={{ fontSize: 10 }} width={72} />
                <Tooltip formatter={(v: number) => formatBrl(v)} contentStyle={{ fontSize: 12 }} />
                <Legend />
                <Line type="monotone" dataKey="receitas" name="Receita" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mm3" name="MM3" stroke="#3b82f6" strokeWidth={1.5} dot={false} connectNulls />
                <Line type="monotone" dataKey="mm6" name="MM6" stroke="#a855f7" strokeWidth={1.5} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

      {/* Fluxo visual (waterfall simplificado) */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
          Fluxo do resultado
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {waterfallSteps.map((step, i) => (
            <React.Fragment key={step.label}>
              <div
                className={`flex flex-col items-center rounded-lg px-3 py-2 min-w-[100px] ${
                  step.tipo === "entrada"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : step.tipo === "saida"
                      ? "bg-red-500/15 text-red-700 dark:text-red-400"
                      : "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                }`}
              >
                <span className="text-xs font-medium opacity-80">{step.label}</span>
                <span className="text-sm font-bold">
                  {step.valor >= 0 ? "" : "-"}
                  {formatBrl(Math.abs(step.valor))}
                </span>
              </div>
              {i < waterfallSteps.length - 1 && (
                <span className="text-[var(--color-text-secondary)]">→</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {(viewMode === "chart" || viewMode === "both") && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Composição das receitas"
            exportFilename={`dre-composicao-${mes}-${ano}`}
          >
            <div className="space-y-4">
              {receitas <= 0 ? (
                <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
                  Sem receitas no período para exibir composição
                </p>
              ) : composicaoData && composicaoData.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex h-8 w-full overflow-hidden rounded-lg bg-[var(--color-bg-secondary)]">
                    {(() => {
                      const totalPct = composicaoData.reduce((s, d) => s + d.pct, 0);
                      const scale = totalPct > 0 ? 100 / totalPct : 1;
                      return composicaoData.map((item) => {
                        const displayPct = Math.max(0.5, item.pct * scale);
                        return (
                          <div
                            key={item.name}
                            className="flex shrink-0 items-center justify-center transition-all hover:opacity-90"
                            style={{
                              width: `${displayPct}%`,
                              minWidth: item.pct > 0 ? "20px" : 0,
                              backgroundColor: item.fill,
                            }}
                            title={`${item.name}: ${formatBrl(item.value)} (${item.pct.toFixed(1)}%)`}
                          >
                            {displayPct >= 8 && (
                              <span className="truncate px-1 text-[10px] font-medium text-white drop-shadow-sm">
                                {item.pct.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {composicaoData.map((item) => (
                      <span
                        key={item.name}
                        className="flex items-center gap-1.5 text-[var(--color-text-secondary)]"
                      >
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        {item.name}: {item.pct.toFixed(1)}%
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {composicaoData && composicaoData.length > 0 ? (
                <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Receita total: {formatBrl(receitas)} (100%)
                  </p>
                  {composicaoData.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.fill }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2 text-xs">
                          <span className="font-medium text-[var(--color-text-primary)]">
                            {item.name}
                          </span>
                          <span className="shrink-0 font-mono text-[var(--color-text-secondary)]">
                            {formatBrl(item.value)} ({item.pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, item.pct)}%`,
                              backgroundColor: item.fill,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </ChartCard>
          {pieData.length > 0 && (
            <ChartCard
              title="Distribuição da receita"
              exportFilename={`dre-distribuicao-${mes}-${ano}`}
            >
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => {
                      const total = pieData.reduce((s, d) => s + d.value, 0);
                      const pct = total > 0 ? ((Number(v) / total) * 100).toFixed(1) : "0";
                      return `${formatBrl(Number(v))} (${pct}%)`;
                    }}
                    contentStyle={{
                      backgroundColor: "var(--color-bg-secondary)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      color: "var(--color-text-primary)",
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}

      {(viewMode === "table" || viewMode === "both") && (
        <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                <th className="px-4 py-3 text-left font-semibold text-[var(--color-text-primary)]">
                  Descrição
                </th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-primary)]">
                  Valor
                </th>
                {dreAnterior && (
                  <th className="px-4 py-3 text-right font-semibold text-[var(--color-text-primary)]">
                    Var. mês ant.
                  </th>
                )}
                <th className="hidden w-24 px-4 py-3 sm:table-cell">% Receita</th>
              </tr>
            </thead>
            <tbody>
              {DRE_LINHAS.map(({ key, label, tooltip }) => {
                const valor = dre[key as keyof typeof dre] ?? 0;
                const neg = key === "custosVendas" || key === "despesas";
                const destaque = key === "lucroBruto" || key === "lucroOperacional";
                const extra =
                  key === "lucroBruto"
                    ? ` (${margemBruta.toFixed(1)}%)`
                    : key === "lucroOperacional"
                      ? ` (${margemOperacional.toFixed(1)}%)`
                      : "";
                const anterior = dreAnterior?.[key as keyof typeof dreAnterior];
                const variacao =
                  anterior != null && anterior !== 0
                    ? ((valor - anterior) / anterior) * 100
                    : null;
                const pctReceita =
                  receitas > 0 &&
                  (key === "custosVendas" || key === "despesas" || key === "lucroBruto" || key === "lucroOperacional")
                    ? (Math.abs(valor) / receitas) * 100
                    : null;

                return (
                  <tr
                    key={key}
                    className={`border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-bg-secondary)]/50 ${
                      destaque ? "bg-[var(--color-bg-secondary)]/30 font-semibold" : ""
                    } ${key === "custosVendas" || key === "despesas" ? "" : ""}`}
                  >
                    <td
                      className={`px-4 py-3 ${
                        key === "custosVendas" || key === "despesas"
                          ? "pl-8 text-[var(--color-text-secondary)]"
                          : "font-medium text-[var(--color-text-primary)]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {label}
                        <span
                          className="inline-flex cursor-help text-[var(--color-text-secondary)] opacity-70 hover:opacity-100"
                          title={tooltip}
                          aria-label={tooltip}
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                        </span>
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        neg ? "text-red-600 dark:text-red-400" : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {neg ? "–" : ""}
                      {formatBrl(Math.abs(valor))}
                      {extra}
                    </td>
                    {dreAnterior && (
                      <td className="px-4 py-3 text-right">
                        {variacao != null ? (
                          <VariacaoBadge
                            variacao={variacao}
                            tipo={
                              key === "receitas" || key === "lucroBruto" || key === "lucroOperacional"
                                ? "receita"
                                : "custo"
                            }
                          />
                        ) : (
                          <span className="text-xs text-[var(--color-text-secondary)]">—</span>
                        )}
                      </td>
                    )}
                    <td className="hidden px-4 py-3 sm:table-cell">
                      {pctReceita != null ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
                            <div
                              className={`h-full rounded-full ${
                                neg ? "bg-red-500/60" : "bg-emerald-500/60"
                              }`}
                              style={{ width: `${Math.min(100, pctReceita)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right text-xs text-[var(--color-text-secondary)]">
                            {pctReceita.toFixed(1)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[var(--color-text-secondary)]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <details
        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)]"
        open={expandido}
        onToggle={(e) => setExpandido((e.target as HTMLDetailsElement).open)}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]/50">
          {expandido ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          O que significa cada linha?
        </summary>
        <ul className="space-y-2 border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
          {DRE_LINHAS.map(({ label, explain }) => (
            <li key={label}>
              <strong className="text-[var(--color-text-primary)]">{label}:</strong> {explain}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
