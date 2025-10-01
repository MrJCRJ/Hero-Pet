import { useEffect, useMemo, useState } from "react";
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
export function usePedidos(filters, limit = 20) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [page, setPage] = useState(0); // zero-based
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.tipo) p.set("tipo", filters.tipo);
    if (filters.q) p.set("q", filters.q);
    if (filters.from) p.set("from", filters.from);
    if (filters.to) p.set("to", filters.to);
    p.set("limit", String(limit));
    p.set("offset", String(page * limit));
    p.set("meta", "1");
    return p.toString();
  }, [filters, limit, page]);

  // Reset page quando filtros mudarem
  useEffect(() => {
    setPage(0);
  }, [filters.tipo, filters.q, filters.from, filters.to]);

  const reload = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/pedidos?${params}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Falha ao carregar pedidos");
      if (json && Array.isArray(json.data) && json.meta) {
        setData(json.data);
        setTotal(Number(json.meta.total) || 0);
        setHasMore((page + 1) * limit < (Number(json.meta.total) || 0));
      } else {
        // fallback retrocompatível
        const arr = Array.isArray(json) ? json : [];
        setData(arr);
        setTotal(arr.length);
        setHasMore(arr.length === limit); // suposição
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const nextPage = () => {
    if (hasMore && !loading) setPage((p) => p + 1);
  };
  const prevPage = () => {
    if (page > 0 && !loading) setPage((p) => Math.max(0, p - 1));
  };
  const gotoPage = (p) => {
    if (p >= 0 && Number.isFinite(p) && !loading) setPage(p);
  };

  return { loading, data, reload, page, hasMore, nextPage, prevPage, gotoPage, total, limit };
}
