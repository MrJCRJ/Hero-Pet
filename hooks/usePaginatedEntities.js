import { useState, useEffect, useMemo, useRef, useCallback } from "react";

/**
 * Hook de paginação e filtros para entities.
 * Responsabilidades:
 * - Gerenciar filtros (status, pending)
 * - Paginação incremental por offset (limit fixo configurable)
 * - Fetch incremental e inicial com abort controller
 * - Summary paralelo (carregado uma vez; opcional refresh manual)
 */
export function usePaginatedEntities({ limit = 20 } = {}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [pendingOnly, setPendingOnly] = useState(false);
  const [page, setPage] = useState(0); // zero-based
  const [addressFillFilter, setAddressFillFilter] = useState("");
  const [contactFillFilter, setContactFillFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Query string derivada
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (pendingOnly) params.set("pending", "true");
    if (addressFillFilter) params.set("address_fill", addressFillFilter);
    if (contactFillFilter) params.set("contact_fill", contactFillFilter);
    params.set("meta", "1");
    params.set("limit", String(limit));
    params.set("offset", String(page * limit));
    return params.toString();
  }, [statusFilter, pendingOnly, addressFillFilter, contactFillFilter, page, limit]);

  // Reset página ao alterar filtros
  useEffect(() => {
    setPage(0);
  }, [statusFilter, pendingOnly, addressFillFilter, contactFillFilter]);

  // Carregamento principal / incremental
  useEffect(() => {
    async function load() {
      const incremental = page > 0;
      if (incremental) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/v1/entities?${queryString}`, {
          signal: controller.signal,
        });
        if (!res.ok)
          throw new Error(`Falha ao carregar entities: ${res.status}`);
        const data = await res.json();
        if (incremental) {
          setRows((prev) => [...prev, ...data.data]);
          setTotal(data.total);
        } else {
          setRows(data.data);
          setTotal(data.total);
        }
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        if (incremental) setLoadingMore(false);
        else setLoading(false);
      }
    }
    load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [queryString, page]);

  // Summary carregado uma vez (pode ser atualizado via refreshSummary)
  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/entities/summary");
      if (!res.ok) return;
      const data = await res.json();
      setSummary(data);
    } catch (_) {
      /* noop */
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const loadMore = useCallback(() => {
    // evita múltiplos increments durante loadingMore
    if (loading || loadingMore) return;
    if (rows.length >= total) return;
    setPage((p) => p + 1);
  }, [loading, loadingMore, rows.length, total]);

  const refresh = useCallback(() => {
    setPage(0); // triggers reload
  }, []);

  // Reload força recarregar página atual (mantendo offset) ou opcionalmente reset
  const reload = useCallback((opts = { reset: false }) => {
    if (opts.reset) setPage(0);
    else {
      // pequeno hack: alterar page para mesmo valor não dispara efeito, então fazemos bounce
      setPage((p) => {
        return p === 0 ? 0 : p - 1; // se p>0 reduz para re-disparar na sequência
      });
      // microtask para voltar se tivemos bounce
      queueMicrotask(() => {
        setPage((p) => (p < 0 ? 0 : p));
      });
    }
  }, []);

  const canLoadMore = rows.length < total && !loading && !loadingMore;

  return {
    // dados
    rows,
    total,
    summary,
    // estados
    loading,
    loadingMore,
    error,
    statusFilter,
    pendingOnly,
    addressFillFilter,
    contactFillFilter,
    canLoadMore,
    // ações
    setStatusFilter,
    setPendingOnly,
    setAddressFillFilter,
    setContactFillFilter,
    loadMore,
    refresh,
    reload,
    loadSummary,
  };
}
