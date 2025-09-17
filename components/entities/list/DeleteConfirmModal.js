import React from "react";
import { Button } from "components/ui/Button";

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  loading,
  entity,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
        onClick={loading ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar exclusão"
        className="relative z-50 w-full max-w-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-xl p-5 space-y-4 animate-scale-in"
      >
        <h3 className="text-sm font-semibold">Confirmar exclusão</h3>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Tem certeza que deseja excluir <strong>{entity?.name}</strong>? Esta
          ação não pode ser desfeita.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            type="button"
            disabled={loading}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            type="button"
            loading={loading}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </div>
    </div>
  );
}
