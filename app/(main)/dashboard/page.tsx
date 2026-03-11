"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, ShoppingCart, Wallet, Banknote } from "lucide-react";

interface DashboardData {
  cards: {
    vendasHoje: number;
    comprasHoje: number;
    despesasMes: number;
    vendasMes: number;
    comprasMes: number;
    saldoCaixa: number;
  };
  evolucao: Array<{ month: string; vendas: number; compras: number }>;
  ultimosPedidos: Array<{
    id: number;
    tipo: string;
    data: string;
    total: number;
    parceiro: string | null;
    status: string;
  }>;
  ultimasDespesas: Array<{
    id: number;
    descricao: string;
    valor: number;
    data: string;
    categoria: string | null;
  }>;
}

function formatBrl(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function formatDate(s: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/dashboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then(setData)
      .catch((e) => setError(e.message || "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[var(--color-text-secondary)]">Carregando...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
        {error || "Erro ao carregar dados"}
      </div>
    );
  }

  const { cards, evolucao, ultimosPedidos, ultimasDespesas } = data;
  const evolucaoFormatada = evolucao.map((e) => ({
    ...e,
    mesLabel: e.month ? `${String(e.month).slice(5)}/${String(e.month).slice(0, 4)}` : e.month,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        Dashboard
      </h1>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm font-medium">Vendas hoje</span>
          </div>
          <p className="mt-2 text-xl font-bold text-[var(--color-text-primary)]">
            {formatBrl(cards.vendasHoje)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <ShoppingCart className="h-5 w-5" />
            <span className="text-sm font-medium">Compras hoje</span>
          </div>
          <p className="mt-2 text-xl font-bold text-[var(--color-text-primary)]">
            {formatBrl(cards.comprasHoje)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <Wallet className="h-5 w-5" />
            <span className="text-sm font-medium">Despesas (mês)</span>
          </div>
          <p className="mt-2 text-xl font-bold text-[var(--color-text-primary)]">
            {formatBrl(cards.despesasMes)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
            <Banknote className="h-5 w-5" />
            <span className="text-sm font-medium">Saldo caixa (mês)</span>
          </div>
          <p
            className={`mt-2 text-xl font-bold ${
              cards.saldoCaixa >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatBrl(cards.saldoCaixa)}
          </p>
        </div>
      </div>

      {/* Gráfico evolução */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
          Evolução mensal
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolucaoFormatada}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="mesLabel"
                stroke="var(--color-text-secondary)"
                fontSize={12}
              />
              <YAxis
                stroke="var(--color-text-secondary)"
                fontSize={12}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number) => formatBrl(v)}
                labelFormatter={(l) => l}
                contentStyle={{
                  backgroundColor: "var(--color-bg-primary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="vendas"
                name="Vendas"
                stroke="var(--color-accent)"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="compras"
                name="Compras"
                stroke="#6b7280"
                strokeWidth={2}
                dot={{ r: 4 }}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Últimas movimentações */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Últimos pedidos
          </h2>
          <div className="max-h-64 overflow-auto">
            {ultimosPedidos.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Nenhum pedido
              </p>
            ) : (
              <ul className="space-y-2">
                {ultimosPedidos.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between border-b border-[var(--color-border)] pb-2 text-sm last:border-0"
                  >
                    <span>
                      #{p.id} {p.tipo} - {formatDate(p.data)}
                    </span>
                    <span className="font-medium">{formatBrl(p.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-primary)]">
            Últimas despesas
          </h2>
          <div className="max-h-64 overflow-auto">
            {ultimasDespesas.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                Nenhuma despesa
              </p>
            ) : (
              <ul className="space-y-2">
                {ultimasDespesas.map((d) => (
                  <li
                    key={d.id}
                    className="flex justify-between border-b border-[var(--color-border)] pb-2 text-sm last:border-0"
                  >
                    <span>
                      {d.descricao || "Sem descrição"} - {formatDate(d.data)}
                    </span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {formatBrl(d.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
