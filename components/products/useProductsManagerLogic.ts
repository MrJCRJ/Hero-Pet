import React from "react";
import type { Product } from "@/types";
import { MSG } from "components/common/messages";
import { useProducts } from "components/products/hooks";
import { useProductHardDelete } from "./useProductHardDelete";
import { useProductToggle } from "./useProductToggle";
import { useHighlightEntityLoad } from "hooks/useHighlightEntityLoad";
import { toastError } from "components/entities/shared/toast";
import { useToast } from "components/entities/shared";

export function useProductsManagerLogic() {
  const { rows, loading, query, setQ, setCategoria, setSupplierId, setAtivo, refresh } =
    useProducts();
  const { push } = useToast();
  const [showModal, setShowModal] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

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
  }, [query.q, query.categoria, query.supplier_id, query.ativo, refresh]);

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
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

  function openNew(prefill) {
    setEditing(prefill || null);
    setShowModal(true);
  }
  function openEdit(item) {
    setEditing(item);
    setShowModal(true);
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
    setSupplierId,
    setAtivo,
    refresh,
    showModal,
    setShowModal,
    editing,
    setEditing,
    submitting,
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
    visibleRows: rows,
    searchInputRef,
    highlightId,
    loadingHighlight,
    errorHighlight,
    openNew,
    openEdit,
    handleSubmit,
  };
}
