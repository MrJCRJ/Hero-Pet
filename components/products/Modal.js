import React from "react";

export function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-lg mx-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-primary)] shadow-xl max-h-[90vh] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <button className="text-sm opacity-70 hover:opacity-100" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="p-4 overflow-auto max-h-[calc(90vh-52px-52px)]">{children}</div>
        {footer && <div className="px-4 py-3 border-t border-[var(--color-border)]">{footer}</div>}
      </div>
    </div>
  );
}
