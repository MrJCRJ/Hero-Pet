import React from "react";
import {
  fetchSaldo as fetchSaldoService,
  fetchEntities as fetchEntitiesService,
  fetchProdutos as fetchProdutosService,
} from "./service";

// Sincroniza saldo de itens quando tipo é VENDA
export function useSaldoSync({ tipo, itens, setItens }) {
  React.useEffect(() => {
    if (tipo !== "VENDA") return;
    let cancelled = false;
    (async () => {
      let changed = false;
      const next = await Promise.all(
        itens.map(async (it) => {
          if (!it.produto_id || isNaN(Number(it.produto_id))) return it;
          if (it.produto_saldo != null) return it; // já tem saldo
          const saldo = await fetchSaldoService(Number(it.produto_id));
          if (cancelled) return it;
          changed = true;
          return { ...it, produto_saldo: saldo };
        }),
      );
      if (!cancelled && changed) setItens(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [tipo, itens, setItens]);
}

// Fetchers memorizados para autocompletes de entidades/produtos
export function usePedidoFetchers({ tipo, partnerId }) {
  const fetchEntities = React.useCallback(
    async (q) => {
      return fetchEntitiesService({ q, tipo });
    },
    [tipo],
  );

  const fetchProdutos = React.useCallback(
    async (q) => {
      return fetchProdutosService({ q, tipo, partnerId });
    },
    [tipo, partnerId],
  );

  return { fetchEntities, fetchProdutos };
}
