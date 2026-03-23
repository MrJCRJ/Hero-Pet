"use client";

import React, { useEffect, useState, useCallback } from "react";
import { FileText, TrendingUp, BarChart3, Award, Download, Wallet, History, LayoutDashboard } from "lucide-react";
import { DREView } from "./components/DREView";
import { FluxoView } from "./components/FluxoView";
import { MargemView } from "./components/MargemView";
import { RankingView } from "./components/RankingView";
import { TopLucroView } from "./components/TopLucroView";
import { HistoricocustoView } from "./components/HistoricocustoView";
import { ResumoView } from "./components/ResumoView";

type TabId = "dre" | "fluxo" | "margem" | "ranking" | "top-lucro" | "historico-custo" | "resumo";

const DOWNLOAD_TIMEOUT_MS = 60_000;


export default function RelatoriosPage() {
  const [tab, setTab] = useState<TabId>("resumo");
  const skipDataFetch = tab === "historico-custo";
  const isResumoTab = tab === "resumo";
  const [tipoRanking, setTipoRanking] = useState<"vendas" | "fornecedores">("vendas");
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [alertasConsolidado, setAlertasConsolidado] = useState<Array<{ id: string; tipo: "erro" | "aviso"; msg: string; valorAtual?: string | number; acaoSugerida?: string }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consolidadoDownloading, setConsolidadoDownloading] = useState(false);
  const [consolidadoError, setConsolidadoError] = useState<string | null>(null);

  const handleConsolidadoJsonDownload = useCallback(async () => {
    setConsolidadoError(null);
    setConsolidadoDownloading(true);
    const params = new URLSearchParams({ mes: String(mes), ano: String(ano), format: "json" });
    const url = `/api/v1/relatorios/consolidado?${params}`;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
      const res = await fetch(url, { credentials: "include", signal: controller.signal });
      clearTimeout(id);
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setConsolidadoError("Erro ao gerar relatório");
        return;
      }
      let filename = "relatorio_consolidado.json";
      const cd = res.headers.get("Content-Disposition");
      if (cd) {
        const match = cd.match(/filename="?([^";\n]+)"?/);
        if (match) filename = match[1].trim();
      }
      const blob = await res.blob();
      const u = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = u;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(u);
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setConsolidadoError("Tempo esgotado. Tente novamente.");
      } else {
        setConsolidadoError("Erro ao gerar relatório");
      }
    } finally {
      setConsolidadoDownloading(false);
    }
  }, [mes, ano]);

  useEffect(() => {
    if (skipDataFetch && !isResumoTab) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    const monthStr = mes === 0 ? (ano === 0 ? "all" : String(ano)) : `${ano}-${String(mes).padStart(2, "0")}`;
    let url: string;
    if (tab === "resumo") {
      url = `/api/v1/pedidos/summary?month=${monthStr}`;
      const consUrl = `/api/v1/relatorios/consolidado?mes=${mes}&ano=${ano}&format=json`;
      fetch(consUrl)
        .then((r) => (r.ok ? r.json() : Promise.resolve(null)))
        .then((cons) => {
          if (cons && Array.isArray(cons.alertas)) {
            setAlertasConsolidado(
              (cons.alertas as Array<Record<string, unknown>>).map((a) => ({
                id: String(a.id ?? ""),
                tipo: (a.tipo as "erro" | "aviso") ?? "aviso",
                msg: String(a.msg ?? ""),
                valorAtual: (a.valor_atual ?? a.valorAtual) as string | number | undefined,
                acaoSugerida: (a.acao_sugerida ?? a.acaoSugerida) as string | undefined,
              }))
            );
          } else {
            setAlertasConsolidado(null);
          }
        })
        .catch(() => setAlertasConsolidado(null));
    } else {
      setAlertasConsolidado(null);
    }
    if (tab === "resumo") {
      url = `/api/v1/pedidos/summary?month=${monthStr}`;
    } else if (tab === "top-lucro") {
      url = `/api/v1/produtos/top?month=${monthStr}&topN=15&productMonths=6`;
    } else {
      const base = { dre: "/api/v1/relatorios/dre", fluxo: "/api/v1/relatorios/fluxo-caixa", margem: "/api/v1/relatorios/margem-produto", ranking: "/api/v1/relatorios/ranking" };
      url = `${base[tab]}?mes=${mes}&ano=${ano}`;
      if ((tab === "ranking" || tab === "margem" || tab === "fluxo") && mes > 0 && ano > 0) url += "&compare=1";
    }
    const finalUrl = tab === "ranking" ? `${url}&tipo=${tipoRanking}` : url;
    fetch(finalUrl)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then(setData)
      .catch((e) => {
        setError(e.message || "Erro ao carregar");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [tab, mes, ano, tipoRanking, skipDataFetch, isResumoTab]);

  const tabs = [
    { id: "resumo" as TabId, label: "Resumo", icon: LayoutDashboard },
    { id: "dre" as TabId, label: "DRE", icon: FileText },
    { id: "fluxo" as TabId, label: "Fluxo de Caixa", icon: TrendingUp },
    { id: "margem" as TabId, label: "Margem por Produto", icon: BarChart3 },
    { id: "ranking" as TabId, label: "Ranking Vendas", icon: Award },
    { id: "top-lucro" as TabId, label: "Top Lucro", icon: Wallet },
    { id: "historico-custo" as TabId, label: "Histórico Custo", icon: History },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        Relatórios Gerenciais
      </h1>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 rounded-lg border border-[var(--color-border)] p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition ${
                tab === id
                  ? "bg-[var(--color-accent)] text-white"
                  : "hover:bg-[var(--color-bg-secondary)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--color-text-secondary)]">Período:</span>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm"
          >
            <option value={0}>Todos os meses</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString("pt-BR", { month: "long" })}
              </option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm"
          >
            <option value={0}>Últimos 12 meses</option>
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 border-l border-[var(--color-border)] pl-4">
            <span className="text-sm text-[var(--color-text-secondary)]">Relatório consolidado:</span>
            <button
              type="button"
              onClick={handleConsolidadoJsonDownload}
              disabled={consolidadoDownloading}
              className="flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              {consolidadoDownloading ? "Baixando..." : "Baixar JSON"}
            </button>
          </div>
          {consolidadoError && (
            <p className="text-sm text-red-600 dark:text-red-400">{consolidadoError}</p>
          )}
        </div>
        </div>
      </div>

      {loading && (
        <p className="text-[var(--color-text-secondary)]">Carregando...</p>
      )}
      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {tab === "historico-custo" && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-sm">
          <HistoricocustoView />
        </div>
      )}
      {!loading && !error && data && tab !== "historico-custo" && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-sm">
          {tab === "resumo" && (
            <ResumoView
              data={data as Record<string, unknown>}
              mes={mes}
              ano={ano}
              alertasConsolidado={alertasConsolidado}
            />
          )}
          {tab === "dre" && "dre" in data && (
            <DREView
              dre={(data as { dre: Record<string, number> }).dre}
              dreAnterior={(data as { dreAnterior?: Record<string, number> | null }).dreAnterior ?? null}
              mes={mes}
              ano={ano}
            />
          )}
          {tab === "fluxo" && "fluxo" in data && (
            <FluxoView
              fluxo={(data as { fluxo: Record<string, unknown> }).fluxo}
              mes={mes}
              ano={ano}
            />
          )}
          {tab === "margem" && "itens" in data && (
            <MargemView
              itens={(data as { itens: Array<Record<string, unknown>>; totalReceita?: number }).itens}
              totalReceita={(data as { totalReceita?: number }).totalReceita}
              margemAnterior={(data as { margemAnterior?: { totalReceita: number; lucroTotal: number } | null }).margemAnterior ?? null}
              mes={mes}
              ano={ano}
            />
          )}
          {tab === "ranking" && "ranking" in data && (
            <RankingView
              ranking={(data as { ranking: Array<Record<string, unknown>> }).ranking}
              totalGeral={(data as { totalGeral?: number }).totalGeral}
              totalPedidosGeral={(data as { totalPedidosGeral?: number }).totalPedidosGeral}
              ticketMedioGeral={(data as { ticketMedioGeral?: number }).ticketMedioGeral}
              rankingAnterior={(data as { rankingAnterior?: { totalGeral: number } | null }).rankingAnterior ?? null}
              tipo={tipoRanking}
              onTipoChange={setTipoRanking}
              mes={mes}
              ano={ano}
            />
          )}
          {tab === "top-lucro" && (
            <TopLucroView
              data={data as { top?: Record<string, unknown>[]; history?: Record<string, unknown>[]; meta?: Record<string, unknown> }}
              mes={mes}
              ano={ano}
            />
          )}
        </div>
      )}
    </div>
  );
}
