import React from "react";
import { Modal } from "components/common/Modal";
import { ConfirmDialog } from "components/common/ConfirmDialog";
import { ProductForm } from "./ProductForm";
import ProductsHeader from "./ProductsHeader";
import ProductRow from "./ProductRow";
import ProductsFilterBar from "./ProductsFilterBar";
import { ProductHardDeleteDialog } from "./ProductHardDeleteDialog";
import { useProductsManagerLogic } from "./useProductsManagerLogic";
import type { Product } from "@/types";

export function ProductsManager({ linkSupplierId = undefined } = {}) {
  const {
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
    visibleRows,
    searchInputRef,
    highlightId,
    loadingHighlight,
    errorHighlight,
    openNew,
    openEdit,
    handleSubmit,
  } = useProductsManagerLogic();

  return (
    <div className="space-y-3">
      <ProductsFilterBar
        query={query}
        setQ={setQ}
        setCategoria={setCategoria}
        setSupplierId={setSupplierId}
        setAtivo={setAtivo}
        linkSupplierId={linkSupplierId}
        openNew={openNew}
        refresh={refresh}
        searchInputRef={searchInputRef}
      />

      <div className="border border-[var(--color-border)] rounded-md overflow-hidden">
        <table className="w-full text-left">
          <ProductsHeader />
          <tbody>
            {(visibleRows as Product[]).map((p) => (
              <ProductRow
                key={p.id}
                p={p}
                onEdit={openEdit}
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
        <div className="text-xs opacity-70">
          Carregando produto #{highlightId}…
        </div>
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
            key={editing?.id != null ? `edit-${editing.id}` : "novo-produto"}
            initial={editing || { ativo: true, suppliers: [] }}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </Modal>
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
          title={
            (pendingToggle as { action?: string })?.action === "inactivate"
              ? "Inativar produto"
              : "Reativar produto"
          }
          message={
            <p className="text-sm">
              {(pendingToggle as { action?: string })?.action === "inactivate"
                ? "Tem certeza que deseja inativar"
                : "Confirmar reativação de"}{" "}
              <strong>{(pendingToggle as { product?: { nome?: string } }).product?.nome}</strong>?
            </p>
          }
          confirmLabel={
            (pendingToggle as { action?: string })?.action === "inactivate" ? "Inativar" : "Reativar"
          }
          cancelLabel="Cancelar"
          onCancel={cancelToggle}
          onConfirm={confirmToggle}
        />
      )}
    </div>
  );
}
