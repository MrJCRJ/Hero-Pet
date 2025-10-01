import { useEffect, useState } from "react";
import { yyyyMM, boundsFromYYYYMM, dispatchOrdersFilter } from "./utils";

/**
 * Hook para gerenciar o estado do mês selecionado com persistência local
 * @param {string} monthProp - Mês inicial (opcional)
 * @returns {Object} Estado e setters para o mês
 */
export function useMonthState(monthProp) {
  const [month, setMonth] = useState(() => {
    // Ordem de precedência: prop > localStorage > current month
    if (monthProp) return monthProp;
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("orders:month");
        if (stored && /^\d{4}-\d{2}$/.test(stored)) return stored;
      } catch (_) {
        /* ignore */
      }
    }
    return yyyyMM(new Date());
  });

  // Persiste sempre que mudar manualmente
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (month && /^\d{4}-\d{2}$/.test(month)) {
        window.localStorage.setItem("orders:month", month);
      }
    } catch (_) {
      /* noop */
    }
  }, [month]);

  // Atualiza quando prop externa muda
  useEffect(() => {
    if (monthProp && /^\d{4}-\d{2}$/.test(monthProp)) {
      setMonth(monthProp);
    }
  }, [monthProp]);

  return { month, setMonth };
}

/**
 * Hook para carregar dados do dashboard e sincronizar filtros
 * @param {string} month - Mês no formato YYYY-MM
 * @returns {Object} Estado dos dados, loading e erro
 */
export function useDashboardData(month) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

        // Só define se vier num formato esperado; caso contrário, não renderiza
        const looksOk =
          json &&
          typeof json === "object" &&
          json.promissorias &&
          typeof json.vendasMes !== "undefined";

        if (mounted && looksOk) setData(json);
      } catch (e) {
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    // Sincroniza filtros da lista principal com o mês (from/to)
    try {
      const { from, to } = boundsFromYYYYMM(month) || {};
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

/**
 * Hook para carregar e filtrar pedidos
 * @param {Object} filters - Filtros para pedidos
 * @param {number} limit - Limite de resultados
 * @returns {Object} Estado dos pedidos
 */
