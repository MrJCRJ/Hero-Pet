import React, { useEffect, useState } from "react";
import LineAreaChart from "components/common/LineAreaChart";
import { Modal } from "components/common/Modal";
import { ProductForm } from "./ProductForm";
import { useProducts } from "./hooks";
import ProductsHeader from "./ProductsHeader";
import ProductRow from "./ProductRow";
import ProductsFilterBar from "./ProductsFilterBar";
import useProductCosts from "./useProductCosts";
// import { ProductDetail } from "./Detail";

// useProducts extraído para ./hooks

export function ProductsManager({ linkSupplierId }) {
  const { rows, loading, query, setQ, setCategoria, setAtivo, refresh } =
    useProducts();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  // Modal de ações (Editar | Detalhes)
  const [actionTarget, setActionTarget] = useState(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  // Modal de detalhes (gráfico FIFO)
  const [detailTarget, setDetailTarget] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [costHistory, setCostHistory] = useState([]); // [{month: '2025-09', avg_cost: 10.5}]
  const [submitting, setSubmitting] = useState(false);
  const [onlyBelowMin, setOnlyBelowMin] = useState(false);

  useEffect(() => {
    // debounce simples
    const id = setTimeout(() => refresh(), 250);
    return () => clearTimeout(id);
  }, [query.q, query.categoria, query.ativo, refresh]);

  // Refresh inteligente ao receber evento de inventário dos pedidos
  useEffect(() => {
    function onInventoryChanged(ev) {
      try {
        const ids = ev?.detail?.productIds || [];
        if (!Array.isArray(ids) || !ids.length) return;
        const visibleIds = new Set(rows.map((r) => r.id));
        const anyVisible = ids.some((id) => visibleIds.has(Number(id)));
        if (anyVisible) refresh();
      } catch (_) {
        /* noop */
      }
    }
    window.addEventListener("inventory-changed", onInventoryChanged);
    return () =>
      window.removeEventListener("inventory-changed", onInventoryChanged);
  }, [rows, refresh]);

  // Sem paginação: carregamos até 500 por vez

  // Hook centraliza custos/saldos/min_hint
  const { costMap } = useProductCosts(rows);

  // Linhas visíveis considerando filtro "Abaixo do mínimo"
  const visibleRows = onlyBelowMin
    ? rows.filter((p) => {
        const saldo = costMap[p.id]?.saldo;
        const minConfigured =
          p.estoque_minimo != null ? Number(p.estoque_minimo) : null;
        const minHint = costMap[p.id]?.min_hint ?? null;
        const minimo = minConfigured != null ? minConfigured : minHint;
        return (
          Number.isFinite(saldo) && Number.isFinite(minimo) && saldo < minimo
        );
      })
    : rows;

  // formatQtyBR extraído para utils comuns

  // min_hint agora também vem do hook acima

  function openNew(prefill) {
    setEditing(prefill || null);
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setShowModal(true);
  }

  function openActions(item) {
    setActionTarget(item);
    setShowActionsModal(true);
  }

  function openDetails(item) {
    setDetailTarget(item);
    setShowActionsModal(false);
    setShowDetailModal(true);
    fetchCostHistory(item.id);
  }

  async function fetchCostHistory(produtoId) {
    try {
      setDetailLoading(true);
      // Solicita últimos 12 meses explicitamente
      const resp = await fetch(
        `/api/v1/produtos/${produtoId}/custos_historicos?months=12`,
      );
      if (!resp.ok) {
        setCostHistory([]);
        return;
      }
      const json = await resp.json();
      // Backend retorna atualmente { data: [...], meta: {...} }
      // Mas testes/mocks antigos retornam diretamente um array. Suportar ambos.
      let items = [];
      if (Array.isArray(json)) items = json;
      else if (Array.isArray(json?.data)) items = json.data;
      // Ordena por mês crescente (YYYY-MM) para consistência visual
      items = items
        .slice()
        .sort((a, b) => String(a.month).localeCompare(String(b.month)));
      setCostHistory(items);
    } finally {
      setDetailLoading(false);
    }
  }

  // Detalhe removido da UI; manteremos código comentado caso precise voltar
  // function openDetail(item) {
  //   setEditing(item);
  //   setShowDetail(true);
  // }

  async function handleSubmit(data) {
    try {
      setSubmitting(true);
      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `/api/v1/produtos/${editing.id}`
        : "/api/v1/produtos";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Erro ao salvar produto");
      }
      setShowModal(false);
      setEditing(null);
      await refresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInactivate(p) {
    if (!p?.id) return;
    const ok = window.confirm(`Inativar produto "${p.nome}"?`);
    if (!ok) return;
    const resp = await fetch(`/api/v1/produtos/${p.id}`, { method: "DELETE" });
    if (!resp.ok) {
      const txt = await resp.text();
      alert(`Falha ao inativar: ${resp.status} ${txt}`);
      return;
    }
    refresh();
  }

  async function handleReactivate(p) {
    if (!p?.id) return;
    const ok = window.confirm(`Reativar produto "${p.nome}"?`);
    if (!ok) return;
    const resp = await fetch(`/api/v1/produtos/${p.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: p.nome,
        categoria: p.categoria || null,
        ativo: true,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      alert(`Falha ao reativar: ${resp.status} ${txt}`);
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-3">
      <ProductsFilterBar
        query={query}
        setQ={setQ}
        setCategoria={setCategoria}
        setAtivo={setAtivo}
        onlyBelowMin={onlyBelowMin}
        setOnlyBelowMin={setOnlyBelowMin}
        linkSupplierId={linkSupplierId}
        openNew={openNew}
        refresh={refresh}
      />

      <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
        <table className="w-full text-left">
          <ProductsHeader />
          <tbody>
            {visibleRows.map((p) => (
              <ProductRow
                key={p.id}
                p={p}
                costMap={costMap}
                // Agora clique abre modal de ações
                onEdit={openActions}
                onInactivate={handleInactivate}
                onReactivate={handleReactivate}
              />
            ))}
            {!rows.length && (
              <tr>
                <td
                  colSpan={6}
                  className="p-4 text-center text-[var(--color-text-secondary)]"
                >
                  {loading ? "Carregando..." : "Nenhum produto encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showModal && (
        <Modal
          onClose={() => setShowModal(false)}
          title={editing ? "Editar Produto" : "Novo Produto"}
        >
          <ProductForm
            initial={editing || { ativo: true, suppliers: [] }}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </Modal>
      )}
      {showActionsModal && actionTarget && (
        <Modal
          onClose={() => setShowActionsModal(false)}
          title={`Produto: ${actionTarget.nome}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Escolha uma ação para este produto.
            </p>
            <div className="flex gap-3">
              <button
                className="px-3 py-1.5 text-sm rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
                onClick={() => {
                  setShowActionsModal(false);
                  openEdit(actionTarget);
                }}
              >
                Editar
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
                onClick={() => openDetails(actionTarget)}
              >
                Detalhes
              </button>
            </div>
          </div>
        </Modal>
      )}
      {showDetailModal && detailTarget && (
        <Modal
          onClose={() => setShowDetailModal(false)}
          title={`Histórico de Custos • ${detailTarget.nome}`}
        >
          <ProductCostHistoryChart loading={detailLoading} data={costHistory} />
        </Modal>
      )}
    </div>
  );
}

// Componente de gráfico simples inline (SVG) — linha custo médio mensal
function ProductCostHistoryChart({ data, loading }) {
  const parsed = Array.isArray(data)
    ? data
        .filter((d) => d && d.month && Number.isFinite(Number(d.avg_cost)))
        .map((d) => ({ label: d.month, value: Number(d.avg_cost) }))
    : [];
  const [focused, setFocused] = React.useState(null);
  const firstVal = parsed.length ? parsed[0].value : 0;
  const lastPoint = parsed[parsed.length - 1] || null;
  const active = focused || lastPoint;
  const acumuladaPct =
    active && firstVal !== 0 ? ((active.value - firstVal) / firstVal) * 100 : 0;
  const prevPoint =
    active && parsed.length > 1
      ? (() => {
          const idx = parsed.findIndex((p) => p.label === active.label);
          if (idx > 0) return parsed[idx - 1];
          return null;
        })()
      : null;
  const momPct =
    prevPoint && prevPoint.value !== 0
      ? ((active.value - prevPoint.value) / prevPoint.value) * 100
      : 0;
  function formatValue(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 min-w-[360px]">
        <LineAreaChart
          data={parsed}
          loading={loading}
          showArea
          disableTooltip
          onHover={(pt) => setFocused(pt)}
        />
      </div>
      <div className="w-full md:w-64 flex flex-col gap-3 text-xs border rounded p-3 bg-[var(--color-bg-secondary)]">
        <div>
          <div className="text-[10px] uppercase opacity-60 tracking-wide">
            Mês
          </div>
          <div className="text-sm font-semibold">{active?.label || "—"}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase opacity-60 tracking-wide">
            Custo Médio
          </div>
          <div className="text-sm font-semibold">
            {active ? formatValue(active.value) : "—"}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase opacity-60 tracking-wide">
            Var. Mês→Mês
          </div>
          <div
            className={`text-sm font-semibold ${!prevPoint ? "opacity-50" : momPct > 0 ? "text-green-500" : momPct < 0 ? "text-red-400" : ""}`}
          >
            {!prevPoint ? "—" : `${momPct > 0 ? "+" : ""}${momPct.toFixed(1)}%`}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase opacity-60 tracking-wide">
            Var. Acumulada
          </div>
          <div
            className={`text-sm font-semibold ${acumuladaPct === 0 ? "opacity-70" : acumuladaPct > 0 ? "text-green-500" : "text-red-400"}`}
          >
            {active
              ? `${acumuladaPct > 0 ? "+" : ""}${acumuladaPct.toFixed(1)}%`
              : "—"}
          </div>
        </div>
        <div className="pt-2 border-t text-[11px] opacity-70 leading-snug">
          Passe o mouse sobre os pontos. Sem hover mostra o último mês.
        </div>
      </div>
    </div>
  );
}
