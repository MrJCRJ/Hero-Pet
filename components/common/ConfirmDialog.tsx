import React, { useEffect, useRef } from "react";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  title?: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}

export function ConfirmDialog({
  title = "Confirmação",
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  loading = false,
  danger = false,
}: ConfirmDialogProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    // Foca automático no botão principal para acessibilidade
    confirmBtnRef.current?.focus();
  }, []);

  return (
    <Modal title={title} onClose={onCancel} maxWidth="max-w-md">
      <div className="space-y-4">
        {typeof message === "string" ? (
          <p className="text-sm leading-relaxed whitespace-pre-line">
            {message}
          </p>
        ) : (
          message
        )}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => !loading && onConfirm?.()}
            disabled={loading}
            className={`px-3 py-1.5 text-sm font-semibold rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-500 ${danger ? "bg-red-600 text-white border-red-700 hover:bg-red-500" : "bg-blue-600 text-white border-blue-700 hover:bg-blue-500"}`}
          >
            {loading ? "Processando..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
