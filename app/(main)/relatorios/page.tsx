"use client";

import React, { useEffect, useState, useCallback } from "react";
import { FileText, TrendingUp, BarChart3, Award, Download, Wallet, History } from "lucide-react";
import { DREView } from "./components/DREView";
import { FluxoView } from "./components/FluxoView";
import { MargemView } from "./components/MargemView";
import { RankingView } from "./components/RankingView";
import { TopLucroView } from "./components/TopLucroView";
import { HistoricocustoView } from "./components/HistoricocustoView";

type TabId = "dre" | "fluxo" | "margem" | "ranking" | "top-lucro" | "historico-custo";

const DOWNLOAD_TIMEOUT_MS = 60_000;

function getReportPath(tab: TabId) {
  if (tab === "dre") return "dre";
  if (tab === "fluxo") return "fluxo-caixa";
  if (tab === "margem") return "margem-produto";
  if (tab === "ranking") return "ranking";
  if (tab === "historico-custo") return "top-lucro"; // sem export
  return "top-lucro";
}

function isTabWithExport(tab: TabId) {
  return tab !== "top-lucro" && tab !== "historico-custo";
}

export default function RelatoriosPage() {
  const [tab, setTab] = useState<TabId>("dre");
  const skipDataFetch = tab === "historico-custo";
  const [tipoRanking, setTipoRanking] = useState<"vendas" | "fornecedores">("vendas");
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<"pdf" | "xlsx" | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = useCallback(
    async (format: "pdf" | "xlsx") => {
      if (!isTabWithExport(tab)) return;
      setDownloadError(null);
      setDownloading(format);
      const path = getReportPath(tab);
      const ext = format;
      const params = new URLSearchParams({ mes: String(mes), ano: String(ano) });
      if (tab === "ranking") params.set("tipo", tipoRanking);
      params.set("format", format);
      const url = `/api/v1/relatorios/${path}?${params}`;
      const slug = path.replace(/-/g, "_");
      const tipoSuffix = tab === "ranking" ? `_${tipoRanking}` : "";
      const filename = `${slug}${tipoSuffix}_${ano}-${String(mes).padStart(2, "0")}.${ext}`;
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
        const res = await fetch(url, {
          credentials: "include",
          signal: controller.signal,
        });
        clearTimeout(id);
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          setDownloadError(text || `Erro ${res.status} ao gerar ${format.toUpperCase()}`);
          return;
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
          setDownloadError("Tempo esgotado. Tente novamente.");
        } else {
          setDownloadError((e as Error).message || "Erro ao baixar arquivo.");
        }
      } finally {
        setDownloading(null);
      }
    },
    [tab, mes, ano, tipoRanking]
  );

  useEffect(() => {
    if (skipDataFetch) {
      setLoading(false);
      setError(null);
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    const monthStr = `${ano}-${String(mes).padStart(2, "0")}`;
    let url: string;
    if (tab === "top-lucro") {
      url = `/api/v1/produtos/top?month=${monthStr}&topN=15&productMonths=6`;
    } else {
      const base = { dre: "/api/v1/relatorios/dre", fluxo: "/api/v1/relatorios/fluxo-caixa", margem: "/api/v1/relatorios/margem-produto", ranking: "/api/v1/relatorios/ranking" };
      url = `${base[tab]}?mes=${mes}&ano=${ano}`;
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
  }, [tab, mes, ano, tipoRanking, skipDataFetch]);

  const tabs = [
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
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {!loading && data && isTabWithExport(tab) && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleDownload("pdf")}
                disabled={!!downloading}
                className="flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {downloading === "pdf" ? "Baixando..." : "PDF"}
              </button>
              <button
                type="button"
                onClick={() => handleDownload("xlsx")}
                disabled={!!downloading}
                className="flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {downloading === "xlsx" ? "Baixando..." : "Excel"}
              </button>
            </div>
            {downloadError && (
              <p className="text-sm text-red-600 dark:text-red-400">{downloadError}</p>
            )}
          </div>
        )}
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
              itens={(data as { itens: Array<Record<string, unknown>> }).itens}
              mes={mes}
              ano={ano}
            />
          )}
          {tab === "ranking" && "ranking" in data && (
            <RankingView
              ranking={(data as { ranking: Array<Record<string, unknown>> }).ranking}
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
