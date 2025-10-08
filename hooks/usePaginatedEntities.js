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
  // profileFilter: '' | 'client' | 'supplier'
  const [profileFilter, setProfileFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [page, setPage] = useState(0); // zero-based
  const [addressFillFilter, setAddressFillFilter] = useState("");
  const [contactFillFilter, setContactFillFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // Debounce de filtros para evitar múltiplas chamadas em sequência rápida.
  // Em ambiente de teste (NODE_ENV=test) o debounce é bypass para não flakiness.
  const lastFiltersRef = useRef({
    statusFilter,
    profileFilter,
    searchFilter,
    addressFillFilter,
    contactFillFilter,
  });
  const [debouncedFilters, setDebouncedFilters] = useState(() => ({
    statusFilter,
    profileFilter,
    searchFilter,
    addressFillFilter,
    contactFillFilter,
  }));
  useEffect(() => {
    const same =
      lastFiltersRef.current.statusFilter === statusFilter &&
      lastFiltersRef.current.profileFilter === profileFilter &&
      lastFiltersRef.current.searchFilter === searchFilter &&
      lastFiltersRef.current.addressFillFilter === addressFillFilter &&
      lastFiltersRef.current.contactFillFilter === contactFillFilter;
    if (same) return; // nada mudou
    lastFiltersRef.current = {
      statusFilter,
      profileFilter,
      searchFilter,
      addressFillFilter,
      contactFillFilter,
    };
    if (process.env.NODE_ENV === "test") {
      setDebouncedFilters(lastFiltersRef.current);
      return;
    }
    const handle = setTimeout(() => {
      setDebouncedFilters(lastFiltersRef.current);
    }, 250);
    return () => clearTimeout(handle);
  }, [
    statusFilter,
    profileFilter,
    searchFilter,
    addressFillFilter,
    contactFillFilter,
  ]);

  const queryString = useMemo(() => {
    const {
      statusFilter: sf,
      profileFilter: pf,
      searchFilter: search,
      addressFillFilter: af,
      contactFillFilter: cf,
    } = debouncedFilters;
    const params = new URLSearchParams();
    if (sf) params.set("status", sf);
    if (pf) params.set("entity_type", pf === "client" ? "PF" : "PJ");
    if (search) params.set("q", search);
    if (af) params.set("address_fill", af);
    if (cf) params.set("contact_fill", cf);
    params.set("meta", "1");
    params.set("limit", String(limit));
    params.set("offset", String(page * limit));
    return params.toString();
  }, [debouncedFilters, page, limit]);

  // Reset página ao alterar filtros
  useEffect(() => {
    setPage(0);
  }, [
    debouncedFilters.statusFilter,
    debouncedFilters.profileFilter,
    debouncedFilters.searchFilter,
    debouncedFilters.addressFillFilter,
    debouncedFilters.contactFillFilter,
  ]);

  // Carregamento principal
  useEffect(() => {
    async function load() {
      setLoading(true);
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

        const incoming = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
        const incomingTotal =
          typeof data?.total === "number"
            ? data.total
            : Array.isArray(data?.data)
              ? data.data.length
              : Array.isArray(data)
                ? data.length
                : 0;

        // Sempre substitui o conteúdo (não mais incremental)
        setRows(incoming);
        setTotal(incomingTotal);
      } catch (e) {
        if (e.name !== "AbortError") setError(e.message);
      } finally {
        setLoading(false);
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
    // evita múltiplos increments durante loading
    if (loading) return;
    if (rows.length >= total) return;
    setPage((p) => p + 1);
  }, [loading, rows.length, total]);

  const goToPage = useCallback(
    (newPage) => {
      if (loading) return;
      setPage(newPage);
    },
    [loading],
  );

  const nextPage = useCallback(() => {
    if (loading) return;
    const currentPage = page;
    const totalPages = Math.ceil(total / limit);
    if (currentPage < totalPages - 1) {
      setPage(currentPage + 1);
    }
  }, [loading, page, total, limit]);

  const prevPage = useCallback(() => {
    if (loading) return;
    if (page > 0) {
      setPage(page - 1);
    }
  }, [loading, page]);

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

  const canLoadMore = rows.length < total && !loading;
  const currentPage = page + 1; // zero-based para one-based
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages - 1;
  const hasPrevPage = page > 0;

  return {
    // dados
    rows,
    total,
    summary,
    // estados
    loading,
    error,
    statusFilter,
    profileFilter,
    searchFilter,
    addressFillFilter,
    contactFillFilter,
    canLoadMore,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    // ações
    setStatusFilter,
    setProfileFilter,
    setSearchFilter,
    setAddressFillFilter,
    setContactFillFilter,
    loadMore,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    reload,
    loadSummary,
  };
}
