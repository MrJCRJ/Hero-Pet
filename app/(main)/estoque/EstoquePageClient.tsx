"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageSection } from "@/components/layout/PageSection";
import { EstoqueSaldosTable, type SaldoRow } from "@/components/estoque/EstoqueSaldosTable";
import { MovimentacaoModal } from "@/components/estoque/MovimentacaoModal";
import { AlertTriangle, DollarSign, PackageX, Download } from "lucide-react";

type Movimento = {
  id: number;
  produto_id: number;
  tipo: string;
  quantidade: number;
  valor_unitario?: number;
  valor_total?: number;
  documento?: string;
  observacao?: string;
  data_movimento: string;
};

function formatBrl(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

export function EstoquePageClient() {
  const [rows, setRows] = useState<SaldoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [alertaOnly, setAlertaOnly] = useState(false);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (alertaOnly) params.set("alerta", "1");
      if (categoria) params.set("categoria", categoria);
      params.set("limit", "500");
      const res = await fetch(`/api/v1/estoque/resumo?${params}`);
      if (!res.ok) throw new Error("Erro ao carregar");
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search, alertaOnly, categoria]);

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
        if (categoria) params.set("categoria", categoria);
        params.set("limit", "5000");
        const res = await fetch(`/api/v1/estoque/resumo?${params}`, { credentials: "include" });
        if (!res.ok) throw new Error("Erro ao exportar");
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        const filename = `estoque_${new Date().toISOString().slice(0, 10)}.${format}`;
        if (format === "csv") {
          const headers = ["Produto", "Código", "Categoria", "Saldo", "Mínimo", "Custo médio"];
          const lines = [headers.join(";"), ...arr.map((r: SaldoRow) =>
            [
              String(r.nome ?? "").replace(/;/g, ","),
              String(r.codigo_barras ?? ""),
              String(r.categoria ?? ""),
              r.saldo,
              r.estoque_minimo ?? "",
              r.custo_medio ?? "",
            ].join(";")
          )];
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
            { header: "Código", key: "codigo_barras", width: 15 },
            { header: "Categoria", key: "categoria", width: 15 },
            { header: "Saldo", key: "saldo", width: 10 },
            { header: "Mínimo", key: "estoque_minimo", width: 10 },
            { header: "Custo médio", key: "custo_medio", width: 12 },
          ];
          arr.forEach((r: SaldoRow) => ws.addRow(r));
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
    [search, alertaOnly, categoria]
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

  return (
    <PageSection
      title="Estoque"
      description="Visualize saldos e faça movimentações manuais (entrada, saída, ajuste)"
    >
      <div className="space-y-4">
        {indicadores && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 flex items-center gap-3">
              <AlertTriangle className={`h-8 w-8 shrink-0 ${indicadores.produtos_em_alerta > 0 ? "text-amber-500" : "text-[var(--color-text-secondary)]"}`} />
              <div>
                <div className="text-2xl font-bold">{indicadores.produtos_em_alerta}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">Produtos em alerta</div>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 shrink-0 text-[var(--color-text-secondary)]" />
              <div>
                <div className="text-xl font-bold">{formatBrl(indicadores.valor_total_estoque)}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">Valor total em estoque</div>
              </div>
            </div>
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 flex items-center gap-3">
              <PackageX className="h-8 w-8 shrink-0 text-[var(--color-text-secondary)]" />
              <div>
                <div className="text-2xl font-bold">{indicadores.produtos_sem_movimento}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">Sem movimento ({indicadores.dias_sem_movimento}d)</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm w-64"
          />
          <input
            type="text"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Categoria"
            className="rounded border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-sm w-32"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={alertaOnly}
              onChange={(e) => setAlertaOnly(e.target.checked)}
            />
            Apenas em alerta
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
                      <th className="px-3 py-2 text-left">Produto ID</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-right">Qtd</th>
                      <th className="px-3 py-2 text-left">Documento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentos.map((m) => (
                      <tr key={m.id} className="border-b border-[var(--color-border)]">
                        <td className="px-3 py-2">{fmtDate(m.data_movimento)}</td>
                        <td className="px-3 py-2">{m.produto_id}</td>
                        <td className="px-3 py-2">{m.tipo}</td>
                        <td
                          className={`px-3 py-2 text-right ${
                            m.tipo === "ENTRADA" ? "text-green-600" : m.tipo === "SAIDA" ? "text-red-600" : ""
                          }`}
                        >
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
