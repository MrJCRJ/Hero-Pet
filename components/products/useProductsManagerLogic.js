import React from "react";
import { MSG } from "components/common/messages";
import { useProducts } from "components/products/hooks";
import useProductCosts from "components/products/useProductCosts";
import { useProductRanking } from "./useProductRanking";
import { useProductHardDelete } from "./useProductHardDelete";
import { useProductToggle } from "./useProductToggle";
import { useHighlightEntityLoad } from "hooks/useHighlightEntityLoad";
import { toastError } from "components/entities/shared/toast";
import { useToast } from "components/entities/shared";

export function useProductsManagerLogic() {
  const { rows, loading, query, setQ, setCategoria, setAtivo, refresh } =
    useProducts();
  const { push } = useToast();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState(null);
  const [actionTarget, setActionTarget] = React.useState(null);
  const [showActionsModal, setShowActionsModal] = React.useState(false);
  const [detailTarget, setDetailTarget] = React.useState(null);
  const [showDetailModal, setShowDetailModal] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [costHistory, setCostHistory] = React.useState([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [onlyBelowMin, setOnlyBelowMin] = React.useState(false);

  const {
    topData,
    topLoading,
    showTopModal,
    openTopModal,
    closeTopModal,
    fetchTopProdutos,
  } = useProductRanking();
  const {
    hardDeleteTarget,
    hardDeletePwd,
    hardDeleting,
    setHardDeletePwd,
    openHardDelete,
    cancelHardDelete,
    confirmHardDelete,
  } = useProductHardDelete({ refresh, push });
  const {
    pendingToggle,
    openInactivate,
    openReactivate,
    cancelToggle,
    confirmToggle,
  } = useProductToggle({ refresh, push });

  React.useEffect(() => {
    const id = setTimeout(() => refresh(), 250);
    return () => clearTimeout(id);
  }, [query.q, query.categoria, query.ativo, refresh]);

  const searchInputRef = React.useRef(null);
  React.useEffect(() => {
    function onNavigateProdutos(ev) {
      try {
        const q = ev?.detail?.q;
        if (typeof q === "string" && q.startsWith("#")) {
          setQ(q);
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

  React.useEffect(() => {
    function onInventoryChanged(ev) {
      try {
        const ids = ev?.detail?.productIds || [];
        if (!Array.isArray(ids) || !ids.length) return;
        const visibleIds = new Set(rows.map((r) => r.id));
        if (ids.some((id) => visibleIds.has(Number(id)))) refresh();
      } catch (_) {
        /* noop */
      }
    }
    window.addEventListener("inventory-changed", onInventoryChanged);
    return () =>
      window.removeEventListener("inventory-changed", onInventoryChanged);
  }, [rows, refresh]);

  const { costMap } = useProductCosts(rows);

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
      const resp = await fetch(
        `/api/v1/produtos/${produtoId}/custos_historicos?months=12`,
      );
      if (!resp.ok) {
        setCostHistory([]);
        return;
      }
      const json = await resp.json();
      let items = [];
      if (Array.isArray(json)) items = json;
      else if (Array.isArray(json?.data)) items = json.data;
      items = items
        .slice()
        .sort((a, b) => String(a.month).localeCompare(String(b.month)));
      setCostHistory(items);
    } finally {
      setDetailLoading(false);
    }
  }

  const highlightId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("highlight")
      : null;
  const { highlighted, loadingHighlight, errorHighlight } =
    useHighlightEntityLoad({
      highlightId,
      fetcher: async (id) => {
        const res = await fetch(`/api/v1/produtos/${id}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || MSG.GENERIC_ERROR);
        return json;
      },
    });

  React.useEffect(() => {
    if (highlighted) {
      setEditing(highlighted);
      setShowModal(true);
      try {
        if (typeof window !== "undefined" && window.history?.replaceState) {
          const url = new URL(window.location.href);
          url.searchParams.delete("highlight");
          window.history.replaceState({}, document.title, url.toString());
        }
      } catch (_) {
        /* noop */
      }
    }
  }, [highlighted]);

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

  return {
    rows,
    loading,
    query,
    setQ,
    setCategoria,
    setAtivo,
    refresh,
    showModal,
    setShowModal,
    editing,
    setEditing,
    actionTarget,
    showActionsModal,
    setShowActionsModal,
    detailTarget,
    showDetailModal,
    setShowDetailModal,
    detailLoading,
    costHistory,
    submitting,
    onlyBelowMin,
    setOnlyBelowMin,
    topData,
    topLoading,
    showTopModal,
    openTopModal,
    closeTopModal,
    fetchTopProdutos,
    hardDeleteTarget,
    hardDeletePwd,
    hardDeleting,
    setHardDeletePwd,
    openHardDelete,
    cancelHardDelete,
    confirmHardDelete,
    pendingToggle,
    openInactivate,
    openReactivate,
    cancelToggle,
    confirmToggle,
    costMap,
    visibleRows,
    searchInputRef,
    highlightId,
    loadingHighlight,
    errorHighlight,
    openNew,
    openEdit,
    openActions,
    openDetails,
    handleSubmit,
  };
}
