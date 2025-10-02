import { usePaginatedResource } from "./usePaginatedResource";
import { MSG } from "components/common/messages";

/**
 * Hook de paginação e filtros para pedidos (substitui gradualmente usePedidos legacy).
 * Mantém fallback retrocompatível: se resposta não vier no formato { data, meta }, trata como array simples.
 * @param {Object} initialFilters { tipo, q, from, to }
 * @param {number} limit limite por página
 */
export function usePaginatedPedidos(initialFilters = {}, limit = 20) {
  return usePaginatedResource({
    baseUrl: "/api/v1/pedidos",
    initialFilters: { tipo: "", q: "", from: "", to: "", ...initialFilters },
    limit,
    buildParams: (filters) => {
      const p = new URLSearchParams();
      if (filters.tipo) p.set("tipo", filters.tipo);
      if (filters.q) p.set("q", filters.q);
      if (filters.from) p.set("from", filters.from);
      if (filters.to) p.set("to", filters.to);
      return p;
    },
    errorFallback: MSG.PEDIDOS_LOAD_ERROR,
  });
}
