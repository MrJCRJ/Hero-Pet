"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { DespesasManager } from "@/components/despesas";

function formatBrl(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

type TabId = "despesas" | "receber" | "pagar";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "despesas", label: "Despesas", icon: Wallet },
  { id: "receber", label: "Contas a Receber", icon: ArrowDownCircle },
  { id: "pagar", label: "Contas a Pagar", icon: ArrowUpCircle },
];

export default function FinanceiroPage() {
  const searchParams = useSearchParams();
  const tabParam = (searchParams?.get("tab") || "despesas") as TabId;
  const initialTab: TabId = ["despesas", "receber", "pagar"].includes(tabParam) ? tabParam : "despesas";
  const [tab, setTab] = useState<TabId>(initialTab);

  useEffect(() => {
    const t = (searchParams?.get("tab") || "despesas") as TabId;
    if (["despesas", "receber", "pagar"].includes(t)) {
      setTab(t);
    }
  }, [searchParams]);
  const [month, setMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [status, setStatus] = useState("pendentes");
  const [data, setData] = useState<{
    itens: Array<Record<string, unknown>>;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const base = tab === "receber" ? "/api/v1/financeiro/contas-receber" : "/api/v1/financeiro/contas-pagar";
    fetch(`${base}?month=${month}&status=${status}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((d) => setData({ itens: d.itens || [], total: d.total || 0 }))
      .catch((e) => {
        setError(e.message || "Erro");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [tab, month, status]);

  async function baixaReceber(pedidoId: number, seq: number) {
    const key = `p${pedidoId}-${seq}`;
    setPaying(key);
    try {
      const r = await fetch(
        `/api/v1/pedidos/${pedidoId}/promissorias/${seq}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "pay" }),
        }
      );
      if (r.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                itens: prev.itens.filter(
                  (x) => x.pedido_id !== pedidoId || x.seq !== seq
                ),
                total: prev.total - Number(
                  prev.itens.find((x) => x.pedido_id === pedidoId && x.seq === seq)?.amount || 0
                ),
              }
            : null
        );
      }
    } finally {
      setPaying(null);
    }
  }

  async function baixaPagar(item: Record<string, unknown>) {
    if (item.tipo === "despesa") {
      const id = item.despesa_id;
      setPaying(`d${id}`);
      try {
        const r = await fetch(`/api/v1/despesas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "pago",
            data_pagamento: new Date().toISOString().slice(0, 10),
          }),
        });
        if (r.ok) {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  itens: prev.itens.filter((x) => x.despesa_id !== id),
                  total: prev.total - Number(item.amount || 0),
                }
              : null
          );
        }
      } finally {
        setPaying(null);
      }
    } else {
      await baixaReceber(Number(item.pedido_id), Number(item.seq));
    }
  }

  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    );
  }

  const setTabAndUrl = (t: TabId) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", t);
    window.history.replaceState({}, "", url.pathname + "?" + url.searchParams.toString());
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
        Financeiro
      </h1>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-2 rounded-lg border border-[var(--color-border)] p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTabAndUrl(id)}
              className={`flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition ${
                tab === id ? "bg-[var(--color-accent)] text-white" : "hover:bg-[var(--color-bg-secondary)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
        {tab !== "despesas" && (
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        )}
        {tab !== "despesas" && (
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm"
        >
          <option value="pendentes">Pendentes</option>
          {tab === "receber" && <option value="atrasadas">Atrasadas</option>}
          <option value="pagas">Pagas/Recebidas</option>
        </select>
        )}
      </div>

      {tab === "despesas" && <DespesasManager />}

      {tab !== "despesas" && loading && <p className="text-[var(--color-text-secondary)]">Carregando...</p>}
      {error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {tab !== "despesas" && !loading && !error && data && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-sm">
          <p className="mb-4 font-medium">
            Total: {formatBrl(data.total)}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-2 text-left">Parceiro / Descrição</th>
                  <th className="py-2 text-left">Vencimento</th>
                  <th className="py-2 text-right">Valor</th>
                  {status === "pendentes" && (
                    <th className="py-2 text-right">Baixa</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.itens.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-[var(--color-text-secondary)]">
                      Nenhum registro
                    </td>
                  </tr>
                ) : (
                  data.itens.map((item) => {
                    const key =
                      item.tipo === "despesa"
                        ? `d${item.despesa_id}`
                        : `p${item.pedido_id}-${item.seq}`;
                    return (
                      <tr
                        key={key}
                        className="border-b border-[var(--color-border)]"
                      >
                        <td className="py-2">
                          {String(item.partner_name || item.descricao || "-")}
                        </td>
                        <td className="py-2">{String(item.due_date || "-")}</td>
                        <td className="py-2 text-right">
                          {formatBrl(Number(item.amount || 0))}
                        </td>
                        {status === "pendentes" && (
                          <td className="py-2 text-right">
                            <button
                              onClick={() =>
                                tab === "receber"
                                  ? baixaReceber(
                                      Number(item.pedido_id),
                                      Number(item.seq)
                                    )
                                  : baixaPagar(item)
                              }
                              disabled={!!paying}
                              className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {paying === key ? "..." : "Dar baixa"}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
