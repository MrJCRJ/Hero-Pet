import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, { type = "success", timeout = 6000 } = {}) => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (timeout) {
        setTimeout(() => remove(id), timeout);
      }
      return id;
    },
    [remove],
  );

  const value = { push, remove };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed z-50 bottom-4 right-4 flex flex-col gap-2 max-w-sm"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md shadow px-4 py-2 text-sm text-white flex items-start gap-3 animate-fade-in-up ${t.type === "error"
              ? "bg-red-600"
              : t.type === "warn"
                ? "bg-yellow-600"
                : "bg-green-600"
              }`}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="opacity-70 hover:opacity-100 transition-colors"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx)
    throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return ctx;
}

// Helper padronizado para exibir erros a partir de objetos Error, resposta ou string.
export function toastError(push, err, fallback = "Operação falhou") {
  try {
    if (!push) return;
    if (!err) {
      push(fallback, { type: "error" });
      return;
    }
    if (typeof err === "string") {
      push(err, { type: "error" });
      return;
    }
    if (err instanceof Error) {
      push(err.message || fallback, { type: "error" });
      return;
    }
    // Tentativa de extrair message comum
    const msg = err.message || err.error || err.msg || fallback;
    push(msg, { type: "error" });
  } catch (_) {
    // fallback silencioso (ignoramos erros de push também)
    try {
      push(fallback, { type: "error" });
    } catch (__) {
      /* noop */
    }
  }
}

// Pequena animação via util class, pode ser movida para CSS global se preferir
// (como fallback inline style)
