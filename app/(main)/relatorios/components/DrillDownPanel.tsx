"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatBrl } from "./shared/utils";
import { X } from "lucide-react";

export type DrillDownTipo = "margem" | "despesas" | "promissorias" | "vendas";

export interface DrillDownPanelProps {
  tipo: DrillDownTipo;
  mes: number;
  ano: number;
  monthStr?: string;
  growthHistory?: Array<{ month: string; vendas: number; lucro: number; margem: number }>;
  onClose: () => void;
}

function formatDate(s: string) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return s;
  }
}

function diasAtraso(dueDate: string) {
  try {
    const d = new Date(dueDate);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  } catch {
    return 0;
  }
}

const TITULOS: Record<DrillDownTipo, string> = {
  margem: "Produtos por margem (investigar baixa margem)",
  despesas: "Despesas do período",
  promissorias: "Promissórias atrasadas por cliente",
  vendas: "Evolução de vendas",
};

export function DrillDownPanel({
  tipo,
  mes,
  ano,
  monthStr,
  growthHistory = [],
  onClose,
}: DrillDownPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [margemData, setMargemData] = useState<
    Array<{ produto_id: number; nome: string; receita: number; cogs: number; lucro: number; margem: number; categoria?: string }>
  >([]);
  const [despesasData, setDespesasData] = useState<
    Array<{ id: number; descricao: string; categoria: string; valor: number; data_vencimento: string }>
  >([]);
  const [promissoriasData, setPromissoriasData] = useState<
    Array<{ pedido_id: number; seq: number; due_date: string; amount: number; partner_name: string }>
  >([]);

  useEffect(() => {
    if (tipo === "vendas") {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const now = new Date();
    const effMes = mes > 0 ? mes : ano > 0 ? 1 : now.getMonth() + 1;
    const effAno = ano > 0 ? ano : now.getFullYear();
    const effMonthStr = monthStr || `${effAno}-${String(effMes).padStart(2, "0")}`;

    if (tipo === "margem") {
      fetch(`/api/v1/relatorios/margem-produto?mes=${mes}&ano=${ano}&limit=50`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
        .then((json) => {
          const itens = (json.itens || []).map((r: Record<string, unknown>) => ({
            produto_id: r.produto_id,
            nome: r.nome,
            receita: Number(r.receita || 0),
            cogs: Number(r.cogs || 0),
            lucro: Number(r.lucro || 0),
            margem: Number(r.margem || 0),
            categoria: r.categoria as string | undefined,
          }));
          setMargemData(itens.sort((a: { margem: number }, b: { margem: number }) => a.margem - b.margem));
        })
        .catch((e) => setError(e.message || "Erro ao carregar"))
        .finally(() => setLoading(false));
      return;
    }

    if (tipo === "despesas") {
      fetch(`/api/v1/despesas?mes=${effMes}&ano=${effAno}&limit=100`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
        .then((json) => {
          const rows = (json.data || []).map((r: Record<string, unknown>) => ({
            id: Number(r.id ?? 0),
            descricao: (r.descricao as string) || "",
            categoria: (r.categoria as string) || "",
            valor: Number(r.valor || 0),
            data_vencimento: (r.data_vencimento as string) || "",
          }));
          setDespesasData(rows);
        })
        .catch((e) => setError(e.message || "Erro ao carregar"))
        .finally(() => setLoading(false));
      return;
    }

    if (tipo === "promissorias") {
      fetch(`/api/v1/pedidos/promissorias?status=atrasadas&month=${effMonthStr}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
        .then((rows) => {
          setPromissoriasData(
            (Array.isArray(rows) ? rows : []).map((r: Record<string, unknown>) => ({
              pedido_id: Number(r.pedido_id ?? 0),
              seq: Number(r.seq ?? 0),
              due_date: (r.due_date as string) || "",
              amount: Number(r.amount || 0),
              partner_name: (r.partner_name as string) || "",
            }))
          );
        })
        .catch((e) => setError(e.message || "Erro ao carregar"))
        .finally(() => setLoading(false));
      return;
    }

    setLoading(false);
  }, [tipo, mes, ano, monthStr]);

  const titulo = TITULOS[tipo];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drill-down-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <h2 id="drill-down-title" className="text-lg font-semibold text-[var(--color-text-primary)]">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <p className="py-8 text-center text-sm text-[var(--color-text-secondary)]">
              Carregando...
            </p>
          )}
          {error && (
            <p className="rounded border border-red-200 bg-red-50 py-4 text-center text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          {!loading && !error && tipo === "margem" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="px-2 py-2 text-left">Produto</th>
                    <th className="px-2 py-2 text-right">Receita</th>
                    <th className="px-2 py-2 text-right">COGS</th>
                    <th className="px-2 py-2 text-right">Lucro</th>
                    <th className="px-2 py-2 text-right">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {margemData.map((r) => (
                    <tr key={r.produto_id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="px-2 py-1.5 font-medium" title={r.nome}>
                        {r.nome.length > 40 ? `${r.nome.slice(0, 40)}...` : r.nome}
                      </td>
                      <td className="px-2 py-1.5 text-right">{formatBrl(r.receita)}</td>
                      <td className="px-2 py-1.5 text-right">{formatBrl(r.cogs)}</td>
                      <td className="px-2 py-1.5 text-right">{formatBrl(r.lucro)}</td>
                      <td
                        className={`px-2 py-1.5 text-right ${
                          r.margem < 15 ? "font-medium text-amber-600 dark:text-amber-400" : ""
                        }`}
                      >
                        {r.margem.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {margemData.length === 0 && (
                <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">
                  Nenhum produto com vendas no período.
                </p>
              )}
            </div>
          )}

          {!loading && !error && tipo === "despesas" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="px-2 py-2 text-left">Descrição</th>
                    <th className="px-2 py-2 text-left">Categoria</th>
                    <th className="px-2 py-2 text-right">Valor</th>
                    <th className="px-2 py-2 text-left">Vencimento</th>
                  </tr>
                </thead>
                <tbody>
                  {despesasData.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="px-2 py-1.5" title={r.descricao}>
                        {r.descricao.length > 35 ? `${r.descricao.slice(0, 35)}...` : r.descricao}
                      </td>
                      <td className="px-2 py-1.5">{r.categoria}</td>
                      <td className="px-2 py-1.5 text-right font-medium">{formatBrl(r.valor)}</td>
                      <td className="px-2 py-1.5">{formatDate(r.data_vencimento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {despesasData.length === 0 && (
                <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">
                  Nenhuma despesa no período.
                </p>
              )}
            </div>
          )}

          {!loading && !error && tipo === "promissorias" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="px-2 py-2 text-left">Cliente</th>
                    <th className="px-2 py-2 text-right">Valor</th>
                    <th className="px-2 py-2 text-left">Vencimento</th>
                    <th className="px-2 py-2 text-right">Dias atraso</th>
                  </tr>
                </thead>
                <tbody>
                  {promissoriasData.map((r, i) => (
                    <tr
                      key={`${r.pedido_id}-${r.seq}-${i}`}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="px-2 py-1.5 font-medium">{r.partner_name || "—"}</td>
                      <td className="px-2 py-1.5 text-right">{formatBrl(r.amount)}</td>
                      <td className="px-2 py-1.5">{formatDate(r.due_date)}</td>
                      <td className="px-2 py-1.5 text-right text-amber-600 dark:text-amber-400">
                        {diasAtraso(r.due_date)} dias
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {promissoriasData.length === 0 && (
                <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">
                  Nenhuma promissória atrasada.
                </p>
              )}
            </div>
          )}

          {!loading && !error && tipo === "vendas" && growthHistory.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={growthHistory}
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
                  <Line type="monotone" dataKey="vendas" name="Vendas" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#3b82f6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {!loading && !error && tipo === "vendas" && growthHistory.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--color-text-secondary)]">
              Sem histórico de vendas para exibir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
