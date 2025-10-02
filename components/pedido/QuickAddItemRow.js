import React from "react";
import { Button } from "../ui/Button";
import { SelectionModal } from "../common/SelectionModal";
// Modal genérico substituído pelo componente PriceSuggestionModal
import { PriceSuggestionModal } from "./PriceSuggestionModal";
import useQuickAddItemRowLogic from "./hooks/useQuickAddItemRowLogic";

export function QuickAddItemRow({ tipo, itens, onAppend, fetchProdutos }) {
  const logic = useQuickAddItemRowLogic({ tipo, itens, fetchProdutos, onAppend });
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
        <div>
          <label htmlFor="qa_quantidade" className="block text-xs mb-1">
            Quantidade
          </label>
          <input
            id="qa_quantidade"
            type="number"
            step="1"
            className="w-full border rounded px-2 py-1"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="qa_preco" className="block text-xs mb-1">
            Preço Unitário
          </label>
          <input
            id="qa_preco"
            type="number"
            step="0.01"
            className="w-full border rounded px-2 py-1"
            value={preco}
            onChange={(e) => {
              setPreco(e.target.value);
            }}
          />
        </div>
        <div>
          <label htmlFor="qa_desconto" className="block text-xs mb-1">
            Desconto Unitário
          </label>
          <input
            id="qa_desconto"
            type="number"
            step="0.01"
            className="w-full border rounded px-2 py-1"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
          />
        </div>
        <div className="text-right">
          <Button
            variant="primary"
            size="sm"
            fullWidth={false}
            className="px-2 py-1"
            onClick={handleAdd}
            aria-label="Adicionar item"
            title={
              tipo === "VENDA" &&
                displaySaldo != null &&
                Number.isFinite(Number(quantidade)) &&
                Number(quantidade) > Number(displaySaldo)
                ? "Estoque insuficiente"
                : "Adicionar item"
            }
            disabled={
              (tipo === "VENDA" &&
                displaySaldo != null &&
                Number.isFinite(Number(quantidade)) &&
                Number(quantidade) > Number(displaySaldo)) ||
              !produtoId ||
              !Number.isFinite(Number(quantidade)) ||
              Number(quantidade) <= 0
            }
            icon={(props) => (
              <svg
                {...props}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 5a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H6a1 1 0 110-2h5V6a1 1 0 011-1z" />
              </svg>
            )}
          />
        </div>
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
          onClose={() => setSuggestionModal((prev) => ({ ...prev, open: false }))}
          onApply={(v) => setPreco(String(Number(v).toFixed(2)))}
        />
      )}
    </div>
  );
}
