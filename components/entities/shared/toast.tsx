"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

interface Toast {
  id: number;
  message: string;
  type: string;
}

/* eslint-disable no-unused-vars -- interface param names are for documentation */
interface ToastContextValue {
  push: (message: string, opts?: { type?: string; timeout?: number; assertive?: boolean }) => number;
  pushAssertive: (message: string, opts?: { type?: string; timeout?: number }) => number;
  remove: (id: number, channel?: "polite" | "assertive") => void;
}
/* eslint-enable no-unused-vars */

const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [politeToasts, setPoliteToasts] = useState<Toast[]>([]);
  const [assertiveToasts, setAssertiveToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number, channel: "polite" | "assertive" = "polite") => {
    if (channel === "assertive") {
      setAssertiveToasts((prev) => prev.filter((t) => t.id !== id));
    } else {
      setPoliteToasts((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  const basePush = useCallback(
    (channel: "polite" | "assertive", message: string, { type = "success", timeout = 6000 } = {}) => {
      const id = ++idCounter;
      const toast: Toast = { id, message, type };
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

  const push = useCallback(
    (message: string, opts: { type?: string; timeout?: number; assertive?: boolean } = {}) => {
      if (opts.assertive) return basePush("assertive", message, opts);
      return basePush("polite", message, opts);
    },
    [basePush],
  );

  const pushAssertive = useCallback(
    (message: string, opts: { type?: string; timeout?: number } = {}) =>
      basePush("assertive", message, opts),
    [basePush],
  );

  const value: ToastContextValue = { push, pushAssertive, remove };

  return (
    <ToastContext.Provider value={value}>
      {children}
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

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return ctx;
}

export function toastError(
  push: ToastContextValue["push"],
  err: unknown,
  fallback = "Operação falhou",
  options: { type?: string; assertive?: boolean } = {},
): void {
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
    const obj = err as { message?: string; error?: string; msg?: string };
    const msg = obj.message || obj.error || obj.msg || fallback;
    push(msg, { type: "error", ...options });
  } catch {
    try {
      push(fallback, { type: "error", ...options });
    } catch {
      /* noop */
    }
  }
}

export function criticalError(
  push: ToastContextValue["push"],
  err: unknown,
  fallback = "Falha crítica",
): void {
  toastError(push, err, fallback, { assertive: true });
}
