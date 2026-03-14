"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, HandCoins, Search, Wallet } from "lucide-react";
import { DespesasManager } from "@/components/despesas";
import { AportesManager } from "@/components/aportes/AportesManager";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

function formatBrl(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

type TabId = "despesas" | "aportes" | "receber" | "pagar";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "despesas", label: "Despesas", icon: Wallet },
  { id: "aportes", label: "Aportes de Capital", icon: HandCoins },
  { id: "receber", label: "Contas a Receber", icon: ArrowDownCircle },
  { id: "pagar", label: "Contas a Pagar", icon: ArrowUpCircle },
];

export default function FinanceiroPage() {
  const searchParams = useSearchParams();
  const tabParam = (searchParams?.get("tab") || "despesas") as TabId;
  const initialTab: TabId = ["despesas", "aportes", "receber", "pagar"].includes(tabParam) ? tabParam : "despesas";
  const [tab, setTab] = useState<TabId>(initialTab);

  useEffect(() => {
    const t = (searchParams?.get("tab") || "despesas") as TabId;
    if (["despesas", "aportes", "receber", "pagar"].includes(t)) {
      setTab(t);
    }
  }, [searchParams]);
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState("pendentes");
  const [data, setData] = useState<{
    itens: Array<Record<string, unknown>>;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [confirmingBaixa, setConfirmingBaixa] = useState<{
    item: Record<string, unknown>;
    key: string;
    tipo: "receber" | "pagar";
  } | null>(null);
  const [confirmingDesfazer, setConfirmingDesfazer] = useState<{
    item: Record<string, unknown>;
    key: string;
  } | null>(null);
  const [buscaId, setBuscaId] = useState("");

  useEffect(() => {
    if (tab === "despesas" || tab === "aportes") {
      setLoading(false);
      setData(null);
      return;
    }
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

  function solicitarBaixaReceber(item: Record<string, unknown>) {
    setConfirmingBaixa({
      item,
      key: `p${item.pedido_id}-${item.seq}`,
      tipo: "receber",
    });
  }

  function solicitarBaixaPagar(item: Record<string, unknown>) {
    setConfirmingBaixa({
      item,
      key: item.tipo === "despesa" ? `d${item.despesa_id}` : `p${item.pedido_id}-${item.seq}`,
      tipo: "pagar",
    });
  }

  async function confirmarBaixa() {
    if (!confirmingBaixa) return;
    setConfirmingBaixa(null);
    if (confirmingBaixa.tipo === "pagar") {
      await baixaPagar(confirmingBaixa.item);
    } else {
      await baixaReceber(
        Number(confirmingBaixa.item.pedido_id),
        Number(confirmingBaixa.item.seq)
      );
    }
  }

  async function desfazerBaixa(pedidoId: number, seq: number) {
    const key = `p${pedidoId}-${seq}`;
    setPaying(key);
    try {
      const r = await fetch(
        `/api/v1/pedidos/${pedidoId}/promissorias/${seq}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unpay" }),
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

  const itemParaBaixa = confirmingBaixa?.item;
  const itemParaDesfazer = confirmingDesfazer?.item;

  const itensFiltrados = useMemo(() => {
    if (!data?.itens) return [];
    const q = buscaId.trim().replace(/^#/, "");
    if (!q) return data.itens;
    const n = parseInt(q, 10);
    const isNum = !Number.isNaN(n);
    return data.itens.filter((item) => {
      const pid = item.pedido_id != null ? String(item.pedido_id) : "";
      const did = item.despesa_id != null ? String(item.despesa_id) : "";
      if (isNum) {
        return Number(pid) === n || Number(did) === n;
      }
      return pid.includes(q) || did.includes(q);
    });
  }, [data?.itens, buscaId]);

  const totalFiltrado = useMemo(
    () => itensFiltrados.reduce((s, r) => s + Number(r.amount || 0), 0),
    [itensFiltrados]
  );

  const months: { value: string; label: string }[] = [
    { value: "all", label: "Todos os meses" },
  ];
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      value: v,
      label: new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
      }),
    });
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
        {(tab === "receber" || tab === "pagar") && (
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] px-2 py-1 text-sm"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        )}
        {(tab === "receber" || tab === "pagar") && (
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
        {(tab === "receber" || tab === "pagar") && (
        <div className="relative flex items-center">
          <Search className="absolute left-2 h-4 w-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder="Buscar por ID (ex: 356)"
            value={buscaId}
            onChange={(e) => setBuscaId(e.target.value)}
            className="w-40 rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] pl-8 pr-2 py-1 text-sm placeholder:text-[var(--color-text-secondary)]/70"
            aria-label="Buscar por ID do pedido ou despesa"
          />
        </div>
        )}
      </div>

      {tab === "despesas" && <DespesasManager />}
      {tab === "aportes" && <AportesManager />}

      {(tab === "receber" || tab === "pagar") && loading && <p className="text-[var(--color-text-secondary)]">Carregando...</p>}
      {(tab === "receber" || tab === "pagar") && error && (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {(tab === "receber" || tab === "pagar") && !loading && !error && data && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-sm">
          <p className="mb-4 font-medium">
            Total: {formatBrl(buscaId.trim() ? totalFiltrado : data.total)}
            {buscaId.trim() && (
              <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
                ({itensFiltrados.length} de {data.itens.length} itens)
              </span>
            )}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-2 text-left w-20">ID</th>
                  <th className="py-2 text-left">Parceiro / Descrição</th>
                  <th className="py-2 text-left">Vencimento</th>
                  <th className="py-2 text-right">Valor</th>
                  {(status === "pendentes" || status === "atrasadas") && (
                    <th className="py-2 text-right">Baixa</th>
                  )}
                  {status === "pagas" && (
                    <th className="py-2 text-right">Desfazer</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {itensFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-[var(--color-text-secondary)]">
                      {buscaId.trim() ? "Nenhum item encontrado para este ID" : "Nenhum registro"}
                    </td>
                  </tr>
                ) : (
                  itensFiltrados.map((item) => {
                    const key =
                      item.tipo === "despesa"
                        ? `d${item.despesa_id}`
                        : `p${item.pedido_id}-${item.seq}`;
                    return (
                      <tr
                        key={key}
                        className="border-b border-[var(--color-border)]"
                      >
                        <td className="py-2 font-medium tabular-nums">
                          {item.pedido_id != null
                            ? `#${item.pedido_id}${item.seq != null ? `-${item.seq}` : ""}`
                            : item.despesa_id != null
                              ? `Desp. ${item.despesa_id}`
                              : "-"}
                        </td>
                        <td className="py-2">
                          {String(item.partner_name || item.descricao || "-")}
                        </td>
                        <td className="py-2">{String(item.due_date || "-")}</td>
                        <td className="py-2 text-right">
                          {formatBrl(Number(item.amount || 0))}
                        </td>
                        {(status === "pendentes" || status === "atrasadas") && (
                          <td className="py-2 text-right">
                            <button
                              onClick={() =>
                                tab === "receber"
                                  ? solicitarBaixaReceber(item)
                                  : solicitarBaixaPagar(item)
                              }
                              disabled={!!paying}
                              className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {paying === key ? "..." : "Dar baixa"}
                            </button>
                          </td>
                        )}
                        {status === "pagas" && item.pedido_id != null && item.seq != null && (
                          <td className="py-2 text-right">
                            <button
                              onClick={() => setConfirmingDesfazer({ item, key })}
                              disabled={!!paying}
                              className="rounded bg-amber-600 px-2 py-1 text-xs text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                              {paying === key ? "..." : "Desfazer baixa"}
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

      {confirmingBaixa && itemParaBaixa && (
        <ConfirmDialog
          title="Confirmar baixa"
          message={
            confirmingBaixa.tipo === "receber" ? (
              <>
                <p className="mb-2">
                  Tem certeza que deseja dar baixa nesta parcela?
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Pedido #{String(itemParaBaixa.pedido_id ?? "")} — Parcela #{String(itemParaBaixa.seq ?? "")}
                  <br />
                  {String(itemParaBaixa.partner_name || "-")}
                  <br />
                  Vencimento: {String(itemParaBaixa.due_date || "-")}
                  <br />
                  Valor: {formatBrl(Number(itemParaBaixa.amount || 0))}
                </p>
                <p className="mt-3 text-amber-600 dark:text-amber-400 font-medium">
                  Esta ação não pode ser desfeita.
                </p>
              </>
            ) : (
              <>
                <p className="mb-2">
                  Tem certeza que deseja dar baixa neste item?
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {itemParaBaixa.tipo === "despesa"
                    ? `Despesa: ${String(itemParaBaixa.descricao || "-")}`
                    : `Pedido #${String(itemParaBaixa.pedido_id ?? "")} — Parcela #${String(itemParaBaixa.seq ?? "")}`}
                  <br />
                  {String(itemParaBaixa.partner_name || "-")}
                  <br />
                  Valor: {formatBrl(Number(itemParaBaixa.amount || 0))}
                </p>
                <p className="mt-3 text-amber-600 dark:text-amber-400 font-medium">
                  Esta ação não pode ser desfeita.
                </p>
              </>
            )
          }
          confirmLabel="Sim, dar baixa"
          cancelLabel="Cancelar"
          danger
          loading={!!paying}
          onConfirm={confirmarBaixa}
          onCancel={() => !paying && setConfirmingBaixa(null)}
        />
      )}

      {confirmingDesfazer && itemParaDesfazer && (
        <ConfirmDialog
          title="Desfazer baixa"
          message={
            <>
              <p className="mb-2">
                Tem certeza que deseja desfazer a baixa desta parcela? Ela voltará a constar como pendente.
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Pedido #{String(itemParaDesfazer.pedido_id ?? "")} — Parcela #{String(itemParaDesfazer.seq ?? "")}
                <br />
                {String(itemParaDesfazer.partner_name || "-")}
                <br />
                Valor: {formatBrl(Number(itemParaDesfazer.amount || 0))}
              </p>
            </>
          }
          confirmLabel="Sim, desfazer"
          cancelLabel="Cancelar"
          danger
          loading={!!paying}
          onConfirm={async () => {
            if (!confirmingDesfazer) return;
            setConfirmingDesfazer(null);
            await desfazerBaixa(
              Number(confirmingDesfazer.item.pedido_id),
              Number(confirmingDesfazer.item.seq)
            );
          }}
          onCancel={() => !paying && setConfirmingDesfazer(null)}
        />
      )}
    </div>
  );
}
