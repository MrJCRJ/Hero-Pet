/* eslint-disable no-unused-vars -- callback param names in interface */
import React from "react";
import {
  fetchSaldo as fetchSaldoService,
  fetchEntities as fetchEntitiesService,
  fetchProdutos as fetchProdutosService,
} from "./service";
import type { FormItem } from "./utils";

interface UseSaldoSyncParams {
  tipo: string;
  itens: FormItem[];
  setItens: React.Dispatch<React.SetStateAction<FormItem[]>>;
}
/* eslint-enable no-unused-vars */

// Sincroniza saldo de itens quando tipo é VENDA
export function useSaldoSync({ tipo, itens, setItens }: UseSaldoSyncParams): void {
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
    async (q: string) => {
      return fetchProdutosService({ q, tipo, partnerId });
    },
    [tipo, partnerId],
  );

  return { fetchEntities, fetchProdutos };
}
