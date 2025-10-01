import { useCallback, useEffect, useMemo, useState } from 'react';
import { MSG } from 'components/common/messages';

/**
 * Hook de paginação e filtros para pedidos (substitui gradualmente usePedidos legacy).
 * Mantém fallback retrocompatível: se resposta não vier no formato { data, meta }, trata como array simples.
 * @param {Object} initialFilters { tipo, q, from, to }
 * @param {number} limit limite por página
 */
export function usePaginatedPedidos(initialFilters = {}, limit = 20) {
  const [filters, setFilters] = useState(() => ({ tipo: '', q: '', from: '', to: '', ...initialFilters }));
  const [page, setPage] = useState(0); // zero-based
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  // Recalcula params sempre que filtros, página ou limit mudarem.
  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.tipo) p.set('tipo', filters.tipo);
    if (filters.q) p.set('q', filters.q);
    if (filters.from) p.set('from', filters.from);
    if (filters.to) p.set('to', filters.to);
    p.set('limit', String(limit));
    p.set('offset', String(page * limit));
    p.set('meta', '1');
    return p.toString();
  }, [filters, limit, page]);

  // Reset page quando filtros mudarem
  useEffect(() => {
    setPage(0);
  }, [filters.tipo, filters.q, filters.from, filters.to]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/pedidos?${params}`, { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || MSG.PEDIDOS_LOAD_ERROR);
      if (json && Array.isArray(json.data) && json.meta) {
        setRows(json.data);
        const t = Number(json.meta.total) || 0;
        setTotal(t);
      } else {
        // fallback retrocompatível (resposta como array simples)
        const arr = Array.isArray(json) ? json : [];
        setRows(arr);
        setTotal(arr.length);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    reload();
  }, [reload]);

  const hasMore = (page + 1) * limit < total;
  const nextPage = () => { if (hasMore && !loading) setPage(p => p + 1); };
  const prevPage = () => { if (page > 0 && !loading) setPage(p => Math.max(0, p - 1)); };
  const gotoPage = (p) => { if (p >= 0 && Number.isFinite(p) && !loading) setPage(p); };

  return {
    filters,
    setFilters,
    rows,
    loading,
    error,
    page,
    total,
    hasMore,
    nextPage,
    prevPage,
    gotoPage,
    reload,
    limit,
  };
}
