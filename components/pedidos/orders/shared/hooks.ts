import { useEffect, useState } from "react";
import { yyyyMM, boundsFromYYYYMM, dispatchOrdersFilter } from "./utils";

/**
 * Hook para gerenciar o estado do mês selecionado com persistência local
 */
export function useMonthState(monthProp?: string | null) {
  const [month, setMonth] = useState<string>(() => {
    if (monthProp) return monthProp;
    if (typeof window !== "undefined") {
      try {
        const dashboard = window.localStorage.getItem("orders.dashboard.month");
        if (dashboard && /^\d{4}-\d{2}$/.test(dashboard)) return dashboard;
        const stored = window.localStorage.getItem("orders:month");
        if (stored && /^\d{4}-\d{2}$/.test(stored)) return stored;
      } catch (_) {
        /* ignore */
      }
    }
    return yyyyMM(new Date());
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (month && /^\d{4}-\d{2}$/.test(month)) {
        window.localStorage.setItem("orders:month", month);
        window.localStorage.setItem("orders.dashboard.month", month);
      }
    } catch (_) {
      /* noop */
    }
  }, [month]);

  useEffect(() => {
    if (monthProp && /^\d{4}-\d{2}$/.test(monthProp)) {
      setMonth(monthProp);
    }
  }, [monthProp]);

  return { month, setMonth };
}

export interface DashboardSummaryData {
  promissorias?: unknown;
  vendasMes?: number;
  [key: string]: unknown;
}

/**
 * Hook para carregar dados do dashboard e sincronizar filtros
 */
export function useDashboardData(month: string | null | undefined) {
  const [data, setData] = useState<DashboardSummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = month ? `?month=${encodeURIComponent(month)}` : "";
        const res = await fetch(`/api/v1/pedidos/summary${qs}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Falha ao carregar resumo");

        const looksOk =
          json &&
          typeof json === "object" &&
          json.promissorias &&
          typeof json.vendasMes !== "undefined";

        if (mounted && looksOk) setData(json);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        if (mounted) setError(err.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    try {
      const bounds = boundsFromYYYYMM(month);
      const { from, to } = bounds || {};
      if (from && to) {
        dispatchOrdersFilter({ from, to });
      }
    } catch (_) {
      // noop
    }

    return () => {
      mounted = false;
    };
  }, [month]);

  return { data, loading, error };
}
