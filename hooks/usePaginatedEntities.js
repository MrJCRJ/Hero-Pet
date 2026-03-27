import { useState, useEffect, useMemo, useRef, useCallback } from "react";

/**
 * Hook de paginação e filtros para entities.
 * Responsabilidades:
 * - Gerenciar filtros (status, profile, search, address_fill, contact_fill)
 * - Paginação por offset
 * - Summary paralelo
 */
export function usePaginatedEntities({ limit = 20 } = {}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [profileFilter, setProfileFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [page, setPage] = useState(0);
  const [addressFillFilter, setAddressFillFilter] = useState("");
  const [contactFillFilter, setContactFillFilter] = useState("");
  const [hasOrdersFilter, setHasOrdersFilter] = useState("");
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
    hasOrdersFilter,
  });
  const [debouncedFilters, setDebouncedFilters] = useState(() => ({
    statusFilter,
    profileFilter,
    searchFilter,
    addressFillFilter,
    contactFillFilter,
    hasOrdersFilter,
  }));
  useEffect(() => {
    const same =
      lastFiltersRef.current.statusFilter === statusFilter &&
      lastFiltersRef.current.profileFilter === profileFilter &&
      lastFiltersRef.current.searchFilter === searchFilter &&
      lastFiltersRef.current.addressFillFilter === addressFillFilter &&
      lastFiltersRef.current.contactFillFilter === contactFillFilter &&
      lastFiltersRef.current.hasOrdersFilter === hasOrdersFilter;
    if (same) return; // nada mudou
    lastFiltersRef.current = {
      statusFilter,
      profileFilter,
      searchFilter,
      addressFillFilter,
      contactFillFilter,
      hasOrdersFilter,
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
    hasOrdersFilter,
  ]);

  const queryString = useMemo(() => {
    const {
      statusFilter: sf,
      profileFilter: pf,
      searchFilter: search,
      addressFillFilter: af,
      contactFillFilter: cf,
      hasOrdersFilter: ho,
    } = debouncedFilters;
    const params = new URLSearchParams();
    if (sf) params.set("status", sf);
    if (pf === "supplier") {
      params.set("entity_type", "PJ");
    } else if (pf === "reseller") {
      params.set("entity_type", "PF");
      params.set("tipo_cliente", "pessoa_juridica");
    } else if (pf === "final_customer") {
      params.set("entity_type", "PF");
      params.set("tipo_cliente", "pessoa_fisica");
    }
    if (search) params.set("q", search);
    if (af) params.set("address_fill", af);
    if (cf) params.set("contact_fill", cf);
    if (ho) params.set("has_orders", ho);
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
    debouncedFilters.hasOrdersFilter,
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

  const clearFilters = useCallback(() => {
    setStatusFilter("");
    setProfileFilter("");
    setSearchFilter("");
    setAddressFillFilter("");
    setContactFillFilter("");
    setHasOrdersFilter("");
    setPage(0);
    lastFiltersRef.current = {
      statusFilter: "",
      profileFilter: "",
      searchFilter: "",
      addressFillFilter: "",
      contactFillFilter: "",
      hasOrdersFilter: "",
    };
    setDebouncedFilters(lastFiltersRef.current);
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
    hasOrdersFilter,
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
    setHasOrdersFilter,
    loadMore,
    goToPage,
    nextPage,
    prevPage,
    refresh,
    reload,
    loadSummary,
    clearFilters,
  };
}
