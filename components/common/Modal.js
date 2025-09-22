import React, { useEffect } from "react";

export function Modal({ title, onClose, children, maxWidth = "max-w-2xl" }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={`relative w-full ${maxWidth} bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded shadow-lg max-h-[90vh] overflow-hidden`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="font-semibold text-sm">{title}</h3>
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)]"
          >
            Fechar
          </button>
        </div>
        <div className="p-4 overflow-auto max-h-[calc(90vh-52px-52px)]">
          {children}
        </div>
      </div>
    </div>
  );
}
