import { useCallback, useEffect, useMemo, useState } from "react";
import { MSG } from "components/common/messages";

/**
 * Hook genérico de paginação para recursos REST com pattern limit/offset + meta opcional.
 * Aceita função buildParams para montar filtros adicionais.
 * Retorna API consistente usada em usePaginatedPedidos.
 *
 * @param {Object} options
 * @param {string} options.baseUrl URL base (ex: /api/v1/pedidos)
 * @param {Object} [options.initialFilters] Objeto inicial de filtros
 * @param {number} [options.limit=20] Limite por página
 * @param {(filters:object)=>URLSearchParams} [options.buildParams] Função para montar params custom
 * @param {(json:any)=>{rows:any[], total:number}} [options.parse] Parser custom de resposta
 * @param {string} [options.errorFallback] Mensagem fallback de erro
 */
export function usePaginatedResource({
  baseUrl,
  initialFilters = {},
  limit = 20,
  buildParams,
  parse,
  errorFallback = MSG.GENERIC_ERROR,
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(0); // zero-based
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  const paramsStr = useMemo(() => {
    const p = buildParams ? buildParams(filters) : new URLSearchParams();
    p.set("limit", String(limit));
    p.set("offset", String(page * limit));
    p.set("meta", "1");
    return p.toString();
  }, [filters, limit, page, buildParams]);

  // Reset page quando filtros mudam (ignora mudanças de página ou limit)
  const stringifiedFilters = JSON.stringify(filters);
  useEffect(() => {
    setPage(0);
  }, [stringifiedFilters]); // simplificação: se filtros mudam estruturalmente

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}?${paramsStr}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || errorFallback);
      if (parse) {
        const { rows: parsedRows, total: parsedTotal } = parse(json);
        setRows(Array.isArray(parsedRows) ? parsedRows : []);
        setTotal(Number(parsedTotal) || 0);
      } else if (json && Array.isArray(json.data) && json.meta) {
        setRows(json.data);
        setTotal(Number(json.meta.total) || 0);
      } else {
        const arr = Array.isArray(json) ? json : [];
        setRows(arr);
        setTotal(arr.length);
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [baseUrl, paramsStr, parse, errorFallback]);

  useEffect(() => {
    reload();
  }, [reload]);

  const hasMore = (page + 1) * limit < total;
  const nextPage = () => {
    if (hasMore && !loading) setPage((p) => p + 1);
  };
  const prevPage = () => {
    if (page > 0 && !loading) setPage((p) => Math.max(0, p - 1));
  };
  const gotoPage = (p) => {
    if (p >= 0 && Number.isFinite(p) && !loading) setPage(p);
  };

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
