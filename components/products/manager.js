import React, { useEffect, useState } from "react";
import { useToast } from "components/entities/shared";
import { toastError } from "components/entities/shared/toast";
import { MSG } from "components/common/messages";
import { Modal } from "components/common/Modal";
import { ConfirmDialog } from "components/common/ConfirmDialog"; // ainda usado para toggle
import { ProductForm } from "./ProductForm";
// IMPORTS: usar alias "components/products/*" para facilitar mocks determinísticos em testes
import { useProducts } from "components/products/hooks";
import ProductsHeader from "./ProductsHeader";
import ProductRow from "./ProductRow";
import ProductsFilterBar from "./ProductsFilterBar";
import useProductCosts from "components/products/useProductCosts";
import { TopProdutosRanking } from "./TopProdutosRanking";
import { useProductRanking } from "./useProductRanking";
import { useProductHardDelete } from "./useProductHardDelete";
import { useProductToggle } from "./useProductToggle";
import { ProductActionsModal } from "./ProductActionsModal";
import { ProductDetailModal } from "./ProductDetailModal";
import ProductCostHistoryChart from "./ProductCostHistoryChart";
import { ProductHardDeleteDialog } from "./ProductHardDeleteDialog";
import { useHighlightEntityLoad } from "hooks/useHighlightEntityLoad";
// import { ProductDetail } from "./Detail";

// useProducts extraído para ./hooks

export function ProductsManager({ linkSupplierId }) {
  const { rows, loading, query, setQ, setCategoria, setAtivo, refresh } =
    useProducts();
  const { push } = useToast();
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
  // Hooks extraídos (ranking, hard delete, toggle)
  const { topData, topLoading, showTopModal, openTopModal, closeTopModal, fetchTopProdutos } = useProductRanking();
  const { hardDeleteTarget, hardDeletePwd, hardDeleting, setHardDeletePwd, openHardDelete, cancelHardDelete, confirmHardDelete } = useProductHardDelete({ refresh, push });
  const { pendingToggle, openInactivate, openReactivate, cancelToggle, confirmToggle } = useProductToggle({ refresh, push });

  useEffect(() => {
    // debounce simples
    const id = setTimeout(() => refresh(), 250);
    return () => clearTimeout(id);
  }, [query.q, query.categoria, query.ativo, refresh]);

  // Listener para navegação cross-dashboard (ex: clique em TopProdutosLucro)
  // Evento: navigate:produtos { detail: { q: '#<ID>' }}
  // Efeito: aplica filtro q, foca input e rola ao topo.
  const searchInputRef = React.useRef(null);
  useEffect(() => {
    function onNavigateProdutos(ev) {
      try {
        const q = ev?.detail?.q;
        if (typeof q === "string" && q.startsWith("#")) {
          setQ(q);
          // pequeno delay para garantir re-render antes do focus
          setTimeout(() => {
            searchInputRef.current?.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }, 30);
        }
      } catch (_) {
        /* noop */
      }
    }
    window.addEventListener("navigate:produtos", onNavigateProdutos);
    return () =>
      window.removeEventListener("navigate:produtos", onNavigateProdutos);
  }, [setQ]);

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

  // Suporte a ?highlight=<id> para abrir modal de edição diretamente
  const highlightId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('highlight') : null;
  const { highlighted, loadingHighlight, errorHighlight } = useHighlightEntityLoad({
    highlightId,
    fetcher: async (id) => {
      const res = await fetch(`/api/v1/produtos/${id}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || MSG.GENERIC_ERROR);
      return json;
    },
  });

  useEffect(() => {
    if (highlighted) {
      setEditing(highlighted);
      setShowModal(true);
      try {
        if (typeof window !== 'undefined' && window.history?.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.delete('highlight');
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (_) { /* noop */ }
    }
  }, [highlighted]);

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
        throw new Error(text || MSG.PROD_SAVE_ERROR);
      }
      setShowModal(false);
      setEditing(null);
      await refresh();
    } catch (e) {
      toastError(push, e, MSG.PROD_SAVE_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  // Lógica de inativação/reativação e hard delete agora via hooks

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
        searchInputRef={searchInputRef}
      />

      <ProductsInsightsButton
        loading={topLoading}
        hasData={!!topData}
        onClick={() => {
          if (!topData && !topLoading) fetchTopProdutos();
          openTopModal();
        }}
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
                onInactivate={openInactivate}
                onReactivate={openReactivate}
                onHardDelete={openHardDelete}
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
      {loadingHighlight && highlightId && (
        <div className="text-xs opacity-70">Carregando produto #{highlightId}…</div>
      )}
      {errorHighlight && highlightId && (
        <div className="text-xs text-red-600">{errorHighlight}</div>
      )}
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
        <ProductActionsModal
          target={actionTarget}
          onClose={() => setShowActionsModal(false)}
          onEdit={openEdit}
          onDetails={(p) => openDetails(p)}
        />
      )}
      {showDetailModal && detailTarget && (
        <ProductDetailModal
          target={detailTarget}
          loading={detailLoading}
          data={costHistory}
          onClose={() => setShowDetailModal(false)}
          ChartComponent={ProductCostHistoryChart}
        />
      )}
      <ProductHardDeleteDialog
        target={hardDeleteTarget}
        password={hardDeletePwd}
        setPassword={setHardDeletePwd}
        deleting={hardDeleting}
        onCancel={cancelHardDelete}
        onConfirm={confirmHardDelete}
      />
      {pendingToggle && (
        <ConfirmDialog
          title={pendingToggle.action === 'inactivate' ? 'Inativar produto' : 'Reativar produto'}
          message={
            <p className="text-sm">
              {pendingToggle.action === 'inactivate' ? 'Tem certeza que deseja inativar' : 'Confirmar reativação de'} {" "}
              <strong>{pendingToggle.product.nome}</strong>?
            </p>
          }
          confirmLabel={pendingToggle.action === 'inactivate' ? 'Inativar' : 'Reativar'}
          cancelLabel="Cancelar"
          onCancel={cancelToggle}
          onConfirm={confirmToggle}
        />
      )}
      {showTopModal && (
        <Modal
          onClose={closeTopModal}
          title="Ranking de Produtos por Lucro"
        >
          {topLoading && (
            <div className="text-sm opacity-70">Carregando ranking...</div>
          )}
          {!topLoading && topData && (
            <TopProdutosRanking
              data={topData}
              onNavigate={(id) => {
                closeTopModal();
                setQ(`#${id}`);
                setTimeout(() => searchInputRef.current?.focus(), 30);
              }}
            />
          )}
          {!topLoading && !topData && (
            <div className="text-sm text-red-500">{MSG.GENERIC_ERROR}</div>
          )}
        </Modal>
      )}
    </div>
  );
}

// Botão de Insights extraído para reduzir o escopo do manager
function ProductsInsightsButton({ onClick, loading, hasData }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onClick}
        className="text-left flex-1 min-w-[200px] bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md p-3 hover:bg-[var(--color-bg-primary)] transition-colors"
      >
        <div className="text-xs opacity-70">Insights</div>
        <div className="text-sm font-semibold">Top produtos por lucro</div>
        <div className="text-[11px] opacity-60 mt-1">
          {loading && !hasData ? 'Carregando...' : 'Clique para ver ranking'}
        </div>
      </button>
    </div>
  );
}
