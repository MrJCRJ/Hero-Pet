import React from "react";
import { Modal } from "../common/Modal";

/*
Props:
  mode: 'COMPRA' | 'VENDA'
  onClose(): void
  suggestion: {
     value: number|null
     base?: number|null     // para VENDA (custo)
     markup?: number|null   // para VENDA
     sourceLabel?: string   // texto custom (ex: 'último preço de compra')
     loading?: boolean
     error?: string|null
  }
  onApply(value:number): void
*/

export function PriceSuggestionModal({ mode, suggestion, onClose, onApply }) {
  const { value, base, markup, sourceLabel, loading, error } = suggestion || {};

  if (!loading && !error && value == null) {
    return (
      <Modal title="Preço sugerido" onClose={onClose}>
        <div className="space-y-4 text-sm">
          <p>Nenhuma sugestão disponível.</p>
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={
        loading
          ? "Calculando preço"
          : mode === "COMPRA"
            ? "Aplicar último preço?"
            : "Aplicar preço sugerido?"
      }
      onClose={onClose}
    >
      <div className="space-y-4 text-sm">
        {loading && <p>Carregando…</p>}
        {!loading && error && (
          <p className="text-red-600 dark:text-red-400">{error}</p>
        )}
        {!loading && !error && mode === "COMPRA" && value != null && (
          <p>
            {sourceLabel || "Último preço encontrado"}:{" "}
            <strong>R$ {value.toFixed(2)}</strong>
          </p>
        )}
        {!loading && !error && mode === "VENDA" && value != null && (
          <>
            <p>
              Base custo: {base != null ? `R$ ${base.toFixed(2)}` : "—"} |
              Markup: {markup != null ? `${markup}%` : "—"}
            </p>
            <p>
              Preço sugerido: <strong>R$ {value.toFixed(2)}</strong>
            </p>
          </>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
            onClick={onClose}
          >
            Ignorar
          </button>
          {!loading && !error && value != null && (
            <button
              type="button"
              className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => {
                onApply?.(value);
                onClose?.();
              }}
            >
              Aplicar preço
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
