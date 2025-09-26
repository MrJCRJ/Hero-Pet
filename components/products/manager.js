import React, { useEffect, useState } from "react";
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
  const visibleRows = (onlyBelowMin
    ? rows.filter((p) => {
      const saldo = costMap[p.id]?.saldo;
      const minConfigured =
        p.estoque_minimo != null ? Number(p.estoque_minimo) : null;
      const minHint = costMap[p.id]?.min_hint ?? null;
      const minimo = minConfigured != null ? minConfigured : minHint;
      return (
        Number.isFinite(saldo) &&
        Number.isFinite(minimo) &&
        saldo < minimo
      );
    })
    : rows);

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
                onEdit={openEdit}
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
      {false && <div />}
    </div>
  );
}
