"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { PageSection } from "@/components/layout/PageSection";
import { EstoqueSaldosTable, type SaldoRow } from "@/components/estoque/EstoqueSaldosTable";
import { MovimentacaoModal } from "@/components/estoque/MovimentacaoModal";
import { ChartCard } from "@/app/(main)/relatorios/components/shared/ChartCard";
import { AlertTriangle, DollarSign, PackageX, Download, Wallet, TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { formatBrl } from "@/app/(main)/relatorios/components/shared/utils";
import { formatQtyBR } from "components/common/format";

type Movimento = {
  id: number;
  produto_id: number;
  produto_nome?: string | null;
  tipo: string;
  quantidade: number;
  valor_unitario?: number;
  valor_total?: number;
  documento?: string;
  observacao?: string;
  data_movimento: string;
};

export function EstoquePageClient() {
  const [rows, setRows] = useState<SaldoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [alertaOnly, setAlertaOnly] = useState(false);
  const [semMovimentoOnly, setSemMovimentoOnly] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [indicadores, setIndicadores] = useState<{
    produtos_em_alerta: number;
    valor_total_estoque: number;
    produtos_sem_movimento: number;
    dias_sem_movimento: number;
  } | null>(null);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);
  const [movimentarRow, setMovimentarRow] = useState<SaldoRow | null>(null);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [movimentosTotal, setMovimentosTotal] = useState(0);
  const [movimentosLoading, setMovimentosLoading] = useState(false);
  const [movimentosOffset, setMovimentosOffset] = useState(0);
  const [showHistorico, setShowHistorico] = useState(false);
  const [allCategorias, setAllCategorias] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (alertaOnly) params.set("alerta", "1");
      if (semMovimentoOnly) params.set("sem_movimento", "1");
      if (categoria) params.set("categoria", categoria);
      params.set("limit", "500");
      const res = await fetch(`/api/v1/estoque/resumo?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setRows(arr);
      if (!categoria) {
        const cats = [...new Set((arr as SaldoRow[]).map((r) => r.categoria).filter((c): c is string => typeof c === "string" && c.trim().length > 0))];
        setAllCategorias(cats.sort());
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, alertaOnly, semMovimentoOnly, categoria]);

  useEffect(() => {
    fetch("/api/v1/estoque/indicadores")
      .then((r) => (r.ok ? r.json() : null))
      .then(setIndicadores)
      .catch(() => setIndicadores(null));
  }, []);

  const handleExport = useCallback(
    async (format: "csv" | "xlsx") => {
      setExporting(format);
      try {
        const params = new URLSearchParams();
        if (search) params.set("q", search);
        if (alertaOnly) params.set("alerta", "1");
        if (semMovimentoOnly) params.set("sem_movimento", "1");
        if (categoria) params.set("categoria", categoria);
        params.set("limit", "5000");
        const res = await fetch(`/api/v1/estoque/resumo?${params}`, { credentials: "include" });
        if (!res.ok) throw new Error("Erro ao exportar");
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        const filename = `estoque_${new Date().toISOString().slice(0, 10)}.${format}`;
        if (format === "csv") {
          const headers = [
            "Produto",
            "Categoria",
            "Saldo",
            "Mínimo",
            "Preço compra",
            "Preço venda",
            "P. médio venda",
          ];
          const lines = [
            headers.join(";"),
            ...arr.map((r: SaldoRow) =>
              [
                String(r.nome ?? "").replace(/;/g, ","),
                String(r.categoria ?? ""),
                r.saldo,
                (r.minimo_efetivo ?? r.min_hint) ?? "",
                r.custo_medio ?? "",
                r.preco_tabela ?? "",
                r.preco_medio_venda ?? "",
              ].join(";")
            ),
          ];
          const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
          const u = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = u;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(u);
        } else {
          const { default: ExcelJS } = await import("exceljs");
          const wb = new ExcelJS.Workbook();
          const ws = wb.addWorksheet("Estoque");
          ws.columns = [
            { header: "Produto", key: "nome", width: 30 },
            { header: "Categoria", key: "categoria", width: 15 },
            { header: "Saldo", key: "saldo", width: 10 },
            { header: "Mínimo (30d)", key: "minimo_efetivo", width: 12 },
            { header: "Preço compra", key: "custo_medio", width: 12 },
            { header: "Preço venda", key: "preco_tabela", width: 12 },
            { header: "P. médio venda", key: "preco_medio_venda", width: 14 },
          ];
          arr.forEach((r: SaldoRow) =>
            ws.addRow({
              ...r,
              minimo_efetivo: r.minimo_efetivo ?? r.min_hint,
            })
          );
          const buf = await wb.xlsx.writeBuffer();
          const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          const u = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = u;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(u);
        }
      } catch {
        alert("Erro ao exportar");
      } finally {
        setExporting(null);
      }
    },
    [search, alertaOnly, semMovimentoOnly, categoria]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const LIMIT = 50;
  const fetchMovimentos = useCallback(
    async (append: boolean) => {
      setMovimentosLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(LIMIT));
        params.set("offset", String(append ? movimentosOffset : 0));
        params.set("meta", "1");
        const res = await fetch(`/api/v1/estoque/movimentos?${params}`);
        if (!res.ok) throw new Error("Erro ao carregar");
        const data = await res.json();
        const items = data?.data ?? data;
        const total = data?.meta?.total ?? items.length;
        setMovimentos((prev) => (append ? [...prev, ...items] : items));
        setMovimentosTotal(total);
        setMovimentosOffset(append ? movimentosOffset + LIMIT : LIMIT);
      } catch {
        setMovimentos((prev) => (append ? prev : []));
      } finally {
        setMovimentosLoading(false);
      }
    },
    [movimentosOffset]
  );

  const loadHistorico = useCallback(() => {
    setShowHistorico(true);
    setMovimentosOffset(0);
    fetchMovimentos(false);
  }, [fetchMovimentos]);

  const loadMore = useCallback(() => {
    fetchMovimentos(true);
  }, [fetchMovimentos]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");
  const fmtQty = (n: number) => (n >= 0 ? `+${n}` : String(n));

  const valorPotencialVendas = useMemo(() => {
    return rows.reduce((acc, r) => {
      const precoVenda = r.preco_tabela != null && Number.isFinite(r.preco_tabela) && r.preco_tabela > 0
        ? Number(r.preco_tabela)
        : (r.custo_medio != null && Number.isFinite(r.custo_medio) && r.custo_medio > 0
          ? Number(r.custo_medio) * 1.2
          : 0);
      return acc + r.saldo * precoVenda;
    }, 0);
  }, [rows]);

  const categoriasParaSelect = useMemo(() => allCategorias, [allCategorias]);

  const rowsEmAlerta = useMemo(() => {
    return rows.filter((r) => {
      const min = r.minimo_efetivo ?? r.min_hint;
      return min != null && Number.isFinite(min) && r.saldo < Number(min);
    });
  }, [rows]);

  const chartDataByCategoria = useMemo(() => {
    const map = new Map<string, { valor: number; qtd: number }>();
    rows.forEach((r) => {
      const cat = r.categoria && String(r.categoria).trim() ? String(r.categoria) : "(sem categoria)";
      const valor = r.saldo * (Number(r.custo_medio) || 0);
      const cur = map.get(cat) ?? { valor: 0, qtd: 0 };
      map.set(cat, { valor: cur.valor + valor, qtd: cur.qtd + 1 });
    });
    return Array.from(map.entries())
      .map(([nome, d]) => ({ nome: nome.slice(0, 25), valor: d.valor, qtd: d.qtd }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [rows]);

  return (
    <PageSection
      title="Estoque"
      description="Visualize saldos e faça movimentações manuais (entrada, saída, ajuste)"
    >
      <div className="space-y-4">
        {indicadores && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setAlertaOnly((prev) => !prev)}
              className={`rounded-lg border p-4 flex items-center gap-3 w-full text-left transition-colors ${
                alertaOnly
                  ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                  : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)]"
              }`}
            >
              <AlertTriangle className={`h-8 w-8 shrink-0 ${indicadores.produtos_em_alerta > 0 ? "text-amber-500" : "text-[var(--color-text-secondary)]"}`} />
              <div>
                <div className="text-2xl font-bold">{indicadores.produtos_em_alerta}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">Produtos em alerta {alertaOnly ? "(filtrado)" : "(clique para filtrar)"}</div>
              </div>
            </button>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 shrink-0 text-[var(--color-text-secondary)]" />
              <div>
                <div className="text-xl font-bold">{formatBrl(indicadores.valor_total_estoque)}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">Valor total em estoque</div>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 flex items-center gap-3" title="Saldo × preço de venda (ou custo + 20% quando preço não cadastrado)">
              <Wallet className="h-8 w-8 shrink-0 text-[var(--color-text-secondary)]" />
              <div>
                <div className="text-xl font-bold">{formatBrl(valorPotencialVendas)}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">Valor potencial de vendas</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSemMovimentoOnly((prev) => !prev)}
              className={`rounded-lg border p-4 flex items-center gap-3 w-full text-left transition-colors ${
                semMovimentoOnly
                  ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                  : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)]"
              }`}
            >
              <PackageX className="h-8 w-8 shrink-0 text-[var(--color-text-secondary)]" />
              <div>
                <div className="text-2xl font-bold">{indicadores.produtos_sem_movimento}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">Sem movimento ({indicadores.dias_sem_movimento}d) {semMovimentoOnly ? "(filtrado)" : "(clique para filtrar)"}</div>
              </div>
            </button>
          </div>
        )}

        <Link
          href="/relatorios?tab=top-lucro"
          className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 hover:bg-[var(--color-bg-primary)] transition-colors text-left w-full max-w-xs"
        >
          <TrendingUp className="h-8 w-8 shrink-0 text-[var(--color-accent)]" />
          <div>
            <div className="text-sm font-semibold">Top produtos por lucro</div>
            <div className="text-xs text-[var(--color-text-secondary)]">Ver ranking em relatórios</div>
          </div>
        </Link>

        {rowsEmAlerta.length > 0 && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Produtos em alerta ({rowsEmAlerta.length})
            </h3>
            <div className="overflow-x-auto rounded border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-right">Saldo</th>
                    <th className="px-3 py-2 text-right">Mínimo</th>
                    <th className="px-3 py-2 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {rowsEmAlerta.slice(0, 8).map((row) => (
                    <tr key={row.produto_id} className="border-b border-[var(--color-border)] last:border-b-0">
                      <td className="px-3 py-2 font-medium">{row.nome}</td>
                      <td className="px-3 py-2 text-right">{formatQtyBR(row.saldo)}</td>
                      <td className="px-3 py-2 text-right">{(row.minimo_efetivo ?? row.min_hint) != null ? formatQtyBR(row.minimo_efetivo ?? row.min_hint ?? 0) : "-"}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setMovimentarRow(row)}
                          className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                        >
                          Movimentar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rowsEmAlerta.length > 8 && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                E mais {rowsEmAlerta.length - 8} em alerta. Use o filtro &quot;Apenas em alerta&quot; para ver todos.
              </p>
            )}
          </div>
        )}

        {chartDataByCategoria.length > 0 && (
          <ChartCard title="Valor em estoque por categoria" exportFilename="estoque-por-categoria">
            <ResponsiveContainer width="100%" height={Math.min(300, chartDataByCategoria.length * 32 + 40)}>
              <BarChart
                data={chartDataByCategoria}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <XAxis type="number" tickFormatter={(v: number) => formatBrl(v)} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nome" width={120} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number) => formatBrl(v)}
                  contentStyle={{
                    fontSize: 12,
                    backgroundColor: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "6px",
                  }}
                  cursor={{ fill: "transparent" }}
                />
                <Bar
                  dataKey="valor"
                  name="Valor"
                  fill="var(--color-accent, #3b82f6)"
                  isAnimationActive={false}
                  activeBar={{ fill: "var(--color-accent)", opacity: 0.85 }}
                >
                  {chartDataByCategoria.map((_, i) => (
                    <Cell key={i} fill="var(--color-accent, #3b82f6)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm w-64"
          />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm w-40"
          >
            <option value="">Todas as categorias</option>
            {categoriasParaSelect.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alertaOnly}
              onChange={(e) => setAlertaOnly(e.target.checked)}
            />
            Apenas em alerta
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={semMovimentoOnly}
              onChange={(e) => setSemMovimentoOnly(e.target.checked)}
            />
            Sem movimento (30d)
          </label>
          <div className="flex gap-2 ml-auto">
            <button
              type="button"
              onClick={() => handleExport("csv")}
              disabled={!!exporting}
              className="flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting === "csv" ? "..." : "CSV"}
            </button>
            <button
              type="button"
              onClick={() => handleExport("xlsx")}
              disabled={!!exporting}
              className="flex items-center gap-1 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {exporting === "xlsx" ? "..." : "Excel"}
            </button>
          </div>
        </div>

        <EstoqueSaldosTable
          rows={rows}
          onMovimentar={setMovimentarRow}
          loading={loading}
        />

        <div className="mt-8 border-t border-[var(--color-border)] pt-6">
          {!showHistorico ? (
            <button
              type="button"
              onClick={loadHistorico}
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              Ver histórico de movimentações
            </button>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-3">Histórico de movimentações</h3>
              <div className="overflow-x-auto rounded border border-[var(--color-border)]">
                <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-right">Qtd</th>
                    <th className="px-3 py-2 text-left">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentos.map((m) => (
                    <tr key={m.id} className="border-b border-[var(--color-border)]">
                      <td className="px-3 py-2">{fmtDate(m.data_movimento)}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium">{m.produto_nome ?? `#${m.produto_id}`}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${
                            m.tipo === "ENTRADA"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : m.tipo === "SAIDA"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {m.tipo}
                        </span>
                      </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {fmtQty(m.quantidade)}
                        </td>
                        <td className="px-3 py-2">{m.documento || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {movimentos.length} de {movimentosTotal} movimentações
                </span>
                {movimentos.length < movimentosTotal && (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={movimentosLoading}
                    className="text-sm text-[var(--color-accent)] hover:underline disabled:opacity-50"
                  >
                    {movimentosLoading ? "Carregando..." : "Carregar mais"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {movimentarRow && (
        <MovimentacaoModal
          produto={movimentarRow}
          onClose={() => setMovimentarRow(null)}
          onSuccess={fetchData}
        />
      )}
    </PageSection>
  );
}
