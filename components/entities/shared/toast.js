import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [politeToasts, setPoliteToasts] = useState([]);
  const [assertiveToasts, setAssertiveToasts] = useState([]);

  const remove = useCallback((id, channel = "polite") => {
    if (channel === "assertive") {
      setAssertiveToasts((prev) => prev.filter((t) => t.id !== id));
    } else {
      setPoliteToasts((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  const basePush = useCallback(
    (channel, message, { type = "success", timeout = 6000 } = {}) => {
      const id = ++idCounter;
      const toast = { id, message, type };
      if (channel === "assertive") {
        setAssertiveToasts((prev) => [...prev, toast]);
      } else {
        setPoliteToasts((prev) => [...prev, toast]);
      }
      if (timeout) setTimeout(() => remove(id, channel), timeout);
      return id;
    },
    [remove],
  );

  // push default (polite)
  const push = useCallback(
    (message, opts = {}) => {
      if (opts.assertive) return basePush("assertive", message, opts);
      return basePush("polite", message, opts);
    },
    [basePush],
  );

  const pushAssertive = useCallback(
    (message, opts = {}) => basePush("assertive", message, opts),
    [basePush],
  );

  const value = { push, pushAssertive, remove };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Canal polite */}
      <div
        className="fixed z-50 bottom-4 right-4 flex flex-col gap-2 max-w-sm"
        role="status"
        aria-live="polite"
      >
        {politeToasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md shadow px-4 py-2 text-sm text-white flex items-start gap-3 animate-fade-in-up ${t.type === "error" ? "bg-red-600" : t.type === "warn" ? "bg-yellow-600" : "bg-green-600"}`}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id, "polite")}
              className="opacity-70 hover:opacity-100 transition-colors"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {/* Canal assertive (uso para erros críticos) */}
      <div
        className="fixed z-50 top-4 right-4 flex flex-col gap-2 max-w-sm"
        role="alert"
        aria-live="assertive"
      >
        {assertiveToasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-md shadow px-4 py-2 text-sm text-white flex items-start gap-3 animate-fade-in-up border-2 ${t.type === "error" ? "bg-red-700 border-red-300" : t.type === "warn" ? "bg-yellow-700 border-yellow-300" : "bg-green-700 border-green-300"}`}
          >
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => remove(t.id, "assertive")}
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
export function toastError(
  push,
  err,
  fallback = "Operação falhou",
  options = {},
) {
  try {
    if (!push) return;
    if (!err) {
      push(fallback, { type: "error", ...options });
      return;
    }
    if (typeof err === "string") {
      push(err, { type: "error", ...options });
      return;
    }
    if (err instanceof Error) {
      push(err.message || fallback, { type: "error", ...options });
      return;
    }
    // Tentativa de extrair message comum
    const msg = err.message || err.error || err.msg || fallback;
    push(msg, { type: "error", ...options });
  } catch (_) {
    // fallback silencioso (ignoramos erros de push também)
    try {
      push(fallback, { type: "error", ...options });
    } catch (__) {
      /* noop */
    }
  }
}

// Helper para erros críticos que devem sempre usar canal assertive
export function criticalError(push, err, fallback = "Falha crítica") {
  return toastError(push, err, fallback, { assertive: true });
}

// Pequena animação via util class, pode ser movida para CSS global se preferir
// (como fallback inline style)
