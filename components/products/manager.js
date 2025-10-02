import React from "react";
import { Modal } from "components/common/Modal";
import { ConfirmDialog } from "components/common/ConfirmDialog";
import { ProductForm } from "./ProductForm";
import ProductsHeader from "./ProductsHeader";
import ProductRow from "./ProductRow";
import ProductsFilterBar from "./ProductsFilterBar";
import { TopProdutosRanking } from "./TopProdutosRanking";
import { ProductActionsModal } from "./ProductActionsModal";
import { ProductDetailModal } from "./ProductDetailModal";
import ProductCostHistoryChart from "./ProductCostHistoryChart";
import { ProductHardDeleteDialog } from "./ProductHardDeleteDialog";
import { useProductsManagerLogic } from "./useProductsManagerLogic";
import { MSG } from "components/common/messages";

export function ProductsManager({ linkSupplierId }) {
  const {
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
  } = useProductsManagerLogic();

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
          title={
            pendingToggle.action === "inactivate"
              ? "Inativar produto"
              : "Reativar produto"
          }
          message={
            <p className="text-sm">
              {pendingToggle.action === "inactivate"
                ? "Tem certeza que deseja inativar"
                : "Confirmar reativação de"}{" "}
              <strong>{pendingToggle.product.nome}</strong>?
            </p>
          }
          confirmLabel={
            pendingToggle.action === "inactivate" ? "Inativar" : "Reativar"
          }
          cancelLabel="Cancelar"
          onCancel={cancelToggle}
          onConfirm={confirmToggle}
        />
      )}
      {showTopModal && (
        <Modal onClose={closeTopModal} title="Ranking de Produtos por Lucro">
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
          {loading && !hasData ? "Carregando..." : "Clique para ver ranking"}
        </div>
      </button>
    </div>
  );
}
