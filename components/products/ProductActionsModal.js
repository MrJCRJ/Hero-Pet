import React from "react";
import { Modal } from "components/common/Modal";

// Exibe ações básicas (Editar / Detalhes) para um produto.
export function ProductActionsModal({ target, onClose, onEdit, onDetails }) {
  if (!target) return null;
  return (
    <Modal onClose={onClose} title={`Produto: ${target.nome}`}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Escolha uma ação para este produto.
        </p>
        <div className="flex gap-3">
          <button
            className="px-3 py-1.5 text-sm rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
            onClick={() => {
              onClose();
              onEdit(target);
            }}
          >
            Editar
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
            onClick={() => onDetails(target)}
          >
            Detalhes
          </button>
        </div>
      </div>
    </Modal>
  );
}
