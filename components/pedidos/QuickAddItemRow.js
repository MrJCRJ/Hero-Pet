import React from "react";
// Subcomponentes de QuickAdd extraídos para reduzir complexidade
import { QuickAddQuantityInput } from "./quick-add/QuickAddQuantityInput";
import { QuickAddPriceInput } from "./quick-add/QuickAddPriceInput";
import { QuickAddDiscountInput } from "./quick-add/QuickAddDiscountInput";
import { QuickAddAddButton } from "./quick-add/QuickAddAddButton";
import { SelectionModal } from "../common/SelectionModal";
// Modal genérico substituído pelo componente PriceSuggestionModal
import { PriceSuggestionModal } from "./PriceSuggestionModal";
import useQuickAddItemRowLogic from "./hooks/useQuickAddItemRowLogic";

export function QuickAddItemRow({ tipo, itens, onAppend, fetchProdutos }) {
  const logic = useQuickAddItemRowLogic({
    tipo,
    itens,
    fetchProdutos,
    onAppend,
  });
  const {
    label,
    produtoId,
    quantidade,
    preco,
    desconto,
    showModal,
    suggestionModal,
    produtoSaldoBadge,
    displaySaldo,
    setShowModal,
    setQuantidade,
    setPreco,
    setDesconto,
    handleAdd,
    handleProductSelect,
    setSuggestionModal,
  } = logic;

  return (
    <div className="mb-4 p-3 border rounded-md bg-[var(--color-bg-secondary)]">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs mb-1">Produto</label>
          <button
            type="button"
            className="relative w-full text-left border rounded px-2 pr-24 py-1.5 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-primary)] whitespace-nowrap overflow-hidden"
            onClick={() => setShowModal(true)}
          >
            <span className="inline-block truncate align-middle max-w-full">
              {label || "Selecionar produto"}
            </span>
            {tipo === "VENDA" && produtoId && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-2 py-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-primary)]">
                Est.: {produtoSaldoBadge}
              </span>
            )}
          </button>
        </div>
        <QuickAddQuantityInput value={quantidade} onChange={setQuantidade} />
        <QuickAddPriceInput value={preco} onChange={setPreco} />
        <QuickAddDiscountInput value={desconto} onChange={setDesconto} />
        <QuickAddAddButton
          tipo={tipo}
          displaySaldo={displaySaldo}
          quantidade={quantidade}
          produtoId={produtoId}
          onAdd={handleAdd}
        />
      </div>
      {showModal && (
        <SelectionModal
          title="Selecionar Produto"
          fetcher={fetchProdutos}
          extractLabel={(it) => it.label}
          onSelect={handleProductSelect}
          onClose={() => setShowModal(false)}
          emptyMessage={
            tipo === "COMPRA"
              ? "Este fornecedor não possui produtos relacionados"
              : "Nenhum produto encontrado"
          }
        />
      )}
      {suggestionModal.open && (
        <PriceSuggestionModal
          mode={suggestionModal.mode}
          suggestion={{
            value: suggestionModal.data.value,
            base: suggestionModal.data.base,
            markup: suggestionModal.data.markup,
            sourceLabel: suggestionModal.data.sourceLabel,
            loading: suggestionModal.data.loading,
            error: suggestionModal.data.error,
          }}
          onClose={() =>
            setSuggestionModal((prev) => ({ ...prev, open: false }))
          }
          onApply={(v) => setPreco(String(Number(v).toFixed(2)))}
        />
      )}
    </div>
  );
}
