"use client";

import React, { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatBrl } from "./shared/utils";
import { ChartCard } from "./shared/ChartCard";
import { KPICard } from "./shared/KPICard";
import { DrillDownPanel, type DrillDownTipo } from "./DrillDownPanel";
import { AlertTriangle, TrendingUp, TrendingDown, Search } from "lucide-react";

export interface GrowthHistoryItem {
  month: string;
  vendas: number;
  cogs: number;
  lucro: number;
  margem: number;
  crescimento: number | null;
}

export interface ComprasHistoryItem {
  month: string;
  compras: number;
  crescimento: number | null;
}

export interface PromissoriasData {
  mesAtual: {
    pagos: { count: number; valor: number };
    pendentes: { count: number; valor: number };
    atrasados: { count: number; valor: number };
  };
  proximoMes: { pendentes: { count: number; valor: number } };
  deMesesAnteriores: { emAberto: { count: number; valor: number } };
}

export interface TopProdutoLucro {
  produto_id: number;
  nome: string;
  receita: number;
  cogs: number;
  lucro: number;
  margem: number;
  quantidade: number;
}

export interface AlertaConsolidado {
  id: string;
  tipo: "erro" | "aviso";
  msg: string;
  valorAtual?: string | number;
  acaoSugerida?: string;
}

export interface ResumoViewProps {
  data: {
    month?: string;
    crescimentoMoMPerc?: number | null;
    crescimentoComprasMoMPerc?: number | null;
    vendasMes?: number;
    vendasMesAnterior?: number;
    lucroBrutoMes?: number;
    lucroOperacionalMes?: number;
    margemBrutaPerc?: number;
    margemOperacionalPerc?: number;
    cogsReal?: number;
    despesasMes?: number;
    comprasMes?: number;
    comprasMesAnterior?: number;
    growthHistory?: GrowthHistoryItem[];
    comprasHistory?: ComprasHistoryItem[];
    promissorias?: PromissoriasData;
    topProdutoLucro?: TopProdutoLucro | null;
  };
  mes: number;
  ano: number;
  alertasConsolidado?: AlertaConsolidado[] | null;
}

export function ResumoView({ data, mes, ano, alertasConsolidado }: ResumoViewProps) {
  const isHistorioCompleto = ano === 0 && mes === 0;

  const periodoLabel =
    ano === 0
      ? "Histórico completo"
      : mes === 0
        ? `Ano ${ano} (todos os meses)`
        : `${new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "long" })}/${ano}`;

  const growthHistory = data.growthHistory ?? [];
  const comprasHistory = data.comprasHistory ?? [];
  const prom = data.promissorias;
  const topProduto = data.topProdutoLucro;

  const [drillDown, setDrillDown] = useState<{
    tipo: DrillDownTipo;
    mes: number;
    ano: number;
    monthStr?: string;
  } | null>(null);

  const alertasLocais: Array<{ msg: string; tipo?: "erro" | "aviso"; drillTipo?: DrillDownTipo }> = [];
  if (data.lucroOperacionalMes != null && data.lucroOperacionalMes < 0) {
    alertasLocais.push({ msg: "Lucro operacional negativo no período.", tipo: "erro" });
  }
  const ultimos2MesesMargem = growthHistory.slice(-2);
  const margemAbaixo15Por2Meses =
    ultimos2MesesMargem.length >= 2 &&
    ultimos2MesesMargem.every((h) => h.margem > 0 && h.margem < 15);
  if (margemAbaixo15Por2Meses) {
    alertasLocais.push({
      msg: "Margem bruta abaixo de 15% nos últimos dois meses consecutivos.",
      tipo: "aviso",
      drillTipo: "margem",
    });
  }
  if (prom?.mesAtual?.atrasados && prom.mesAtual.atrasados.count > 0) {
    alertasLocais.push({
      msg: `Há ${formatBrl(prom.mesAtual.atrasados.valor)} em ${prom.mesAtual.atrasados.count} promissória(s) atrasada(s).`,
      tipo: "aviso",
      drillTipo: "promissorias",
    });
  }
  if (data.crescimentoMoMPerc != null && data.crescimentoMoMPerc < 0) {
    alertasLocais.push({
      msg: "Queda nas vendas em relação ao mês anterior.",
      tipo: "aviso",
      drillTipo: "vendas",
    });
  }
  if (
    data.despesasMes != null &&
    data.lucroBrutoMes != null &&
    data.despesasMes > data.lucroBrutoMes
  ) {
    alertasLocais.push({
      msg: "Despesas superam o lucro bruto.",
      tipo: "erro",
      drillTipo: "despesas",
    });
  }

  const effMes = mes || new Date().getMonth() + 1;
  const effAno = ano || new Date().getFullYear();
  const monthStr =
    ano > 0 && mes > 0 ? `${ano}-${String(mes).padStart(2, "0")}` : undefined;

  const alertas =
    alertasConsolidado && alertasConsolidado.length > 0
      ? alertasConsolidado.map((a) => ({
          msg: a.msg,
          tipo: a.tipo as "erro" | "aviso",
          valorAtual: a.valorAtual,
          acaoSugerida: a.acaoSugerida,
          drillTipo: undefined as DrillDownTipo | undefined,
        }))
      : alertasLocais;

  const totalReceber =
    prom
      ? (prom.mesAtual?.pendentes?.valor ?? 0) +
        (prom.mesAtual?.atrasados?.valor ?? 0) +
        (prom.deMesesAnteriores?.emAberto?.valor ?? 0)
      : 0;

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
        Resumo — {periodoLabel}
      </h2>

      {isHistorioCompleto && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          Os indicadores de crescimento mês a mês não são exibidos em &quot;Últimos 12 meses&quot;. Selecione
          um período específico para visualizá-los.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm md:col-span-2 md:row-span-1">
          <h3 className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">
            Lucro operacional
          </h3>
          <p
            className={`text-xl font-semibold ${
              (data.lucroOperacionalMes ?? 0) >= 0
                ? "text-[var(--color-text-primary)]"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {data.lucroOperacionalMes != null
              ? formatBrl(data.lucroOperacionalMes)
              : "—"}
          </p>
          {data.margemOperacionalPerc != null && (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              Margem operacional: {Number(data.margemOperacionalPerc).toFixed(2)}%
            </p>
          )}
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">
            Lucro bruto
          </h3>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">
            {data.lucroBrutoMes != null && data.margemBrutaPerc != null
              ? `${formatBrl(data.lucroBrutoMes)} (${Number(data.margemBrutaPerc).toFixed(2)}%)`
              : "—"}
          </p>
          <button
            type="button"
            onClick={() =>
              setDrillDown({ tipo: "margem", mes: effMes, ano: effAno, monthStr })
            }
            className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <Search className="h-3 w-3" aria-hidden />
            Ver detalhes
          </button>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
          <h3 className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">
            Despesas
          </h3>
          <p className="text-xl font-semibold text-[var(--color-text-primary)]">
            {data.despesasMes != null ? formatBrl(data.despesasMes) : "—"}
          </p>
          <button
            type="button"
            onClick={() =>
              setDrillDown({ tipo: "despesas", mes: effMes, ano: effAno, monthStr })
            }
            className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <Search className="h-3 w-3" aria-hidden />
            Ver detalhes
          </button>
        </div>

        {!isHistorioCompleto && data.crescimentoMoMPerc != null && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
            <h3 className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">
              Crescimento vendas (MoM)
            </h3>
            <p
              className={`flex items-center gap-1 text-xl font-semibold ${
                (data.crescimentoMoMPerc ?? 0) >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {(data.crescimentoMoMPerc ?? 0) >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              {Number(data.crescimentoMoMPerc).toFixed(2)}%
            </p>
            {(data.vendasMes != null || data.vendasMesAnterior != null) && (
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Receita: {formatBrl(data.vendasMes ?? 0)} · Anterior:{" "}
                {formatBrl(data.vendasMesAnterior ?? 0)}
              </p>
            )}
          </div>
        )}

        {!isHistorioCompleto && data.crescimentoComprasMoMPerc != null && (
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
            <h3 className="mb-1 text-sm font-medium text-[var(--color-text-secondary)]">
              Crescimento compras (MoM)
            </h3>
            <p
              className={`flex items-center gap-1 text-xl font-semibold ${
                (data.crescimentoComprasMoMPerc ?? 0) >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {(data.crescimentoComprasMoMPerc ?? 0) >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              {Number(data.crescimentoComprasMoMPerc).toFixed(2)}%
            </p>
          </div>
        )}

        <KPICard
          label="Compras do mês"
          value={data.comprasMes != null ? formatBrl(data.comprasMes) : "—"}
        />
      </div>

      {alertas.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Atenção
          </h3>
          <ul className="space-y-1.5 text-sm text-amber-700 dark:text-amber-300">
            {alertas.map((a, i) => (
              <li key={i} className={a.tipo === "erro" ? "font-medium" : ""}>
                {a.drillTipo ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDrillDown({
                        tipo: a.drillTipo!,
                        mes: effMes,
                        ano: effAno,
                        monthStr,
                      })
                    }
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-left transition-colors hover:bg-amber-200/60 dark:hover:bg-amber-900/40"
                  >
                    <Search className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden />
                    {a.msg}
                  </button>
                ) : (
                  <span>{a.msg}</span>
                )}
                {"valorAtual" in a && a.valorAtual != null && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">({String(a.valorAtual)})</span>
                )}
                {"acaoSugerida" in a && (a as { acaoSugerida?: string }).acaoSugerida && (
                  <p className="mt-0.5 pl-4 text-xs text-amber-600/90 dark:text-amber-400/90">{(a as { acaoSugerida: string }).acaoSugerida}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {drillDown && (
        <DrillDownPanel
          tipo={drillDown.tipo}
          mes={drillDown.mes}
          ano={drillDown.ano}
          monthStr={drillDown.monthStr}
          growthHistory={growthHistory}
          onClose={() => setDrillDown(null)}
        />
      )}

      {prom && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
            Promissórias
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label="Pagas (período)"
              value={formatBrl(prom.mesAtual?.pagos?.valor ?? 0)}
              subtitle={`${prom.mesAtual?.pagos?.count ?? 0} título(s)`}
            />
            <KPICard
              label="Pendentes"
              value={formatBrl(prom.mesAtual?.pendentes?.valor ?? 0)}
              subtitle={`${prom.mesAtual?.pendentes?.count ?? 0} título(s)`}
            />
            <KPICard
              label="Atrasadas"
              value={formatBrl(prom.mesAtual?.atrasados?.valor ?? 0)}
              subtitle={`${prom.mesAtual?.atrasados?.count ?? 0} título(s)`}
            />
            <KPICard
              label="Total a receber"
              value={formatBrl(totalReceber)}
              subtitle="Pendentes + atrasadas + meses anteriores"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-[var(--color-text-secondary)]">
            <span>
              Próximo mês: {formatBrl(prom.proximoMes?.pendentes?.valor ?? 0)} (
              {prom.proximoMes?.pendentes?.count ?? 0} título(s))
            </span>
            <span>
              Em aberto (meses anteriores):{" "}
              {formatBrl(prom.deMesesAnteriores?.emAberto?.valor ?? 0)} (
              {prom.deMesesAnteriores?.emAberto?.count ?? 0} título(s))
            </span>
          </div>
        </div>
      )}

      {topProduto && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
            Top produto por lucro
          </h3>
          <p className="font-medium text-[var(--color-text-primary)]">{topProduto.nome}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Lucro: {formatBrl(topProduto.lucro)} · Margem: {Number(topProduto.margem).toFixed(2)}%
          </p>
        </div>
      )}

      {growthHistory.length > 0 && (
        <ChartCard title="Evolução de vendas e lucro" exportFilename={`resumo-vendas-${mes}-${ano}`}>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={growthHistory.map((r) => ({
                ...r,
                vendasFmt: formatBrl(r.vendas),
                lucroFmt: formatBrl(r.lucro),
              }))}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatBrl(v)} tick={{ fontSize: 10 }} width={75} />
              <Tooltip
                formatter={(v: number) => formatBrl(v)}
                contentStyle={{ fontSize: 12 }}
                labelFormatter={(l) => `Mês: ${l}`}
              />
              <Legend />
              <Line type="monotone" dataKey="vendas" name="Vendas" stroke="#22c55e" strokeWidth={2} />
              <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {comprasHistory.length > 0 && (
        <ChartCard title="Evolução de compras" exportFilename={`resumo-compras-${mes}-${ano}`}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={comprasHistory}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatBrl(v)} tick={{ fontSize: 10 }} width={75} />
              <Tooltip
                formatter={(v: number) => formatBrl(v)}
                contentStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="compras" name="Compras" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {growthHistory.length > 0 && (
        <ChartCard
          title="Margem bruta ao longo do tempo"
          exportFilename={`resumo-margem-${mes}-${ano}`}
        >
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={growthHistory}
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                width={45}
              />
              <Tooltip
                formatter={(v: number) => `${Number(v).toFixed(2)}%`}
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="margem"
                name="Margem %"
                stroke="#8b5cf6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}
