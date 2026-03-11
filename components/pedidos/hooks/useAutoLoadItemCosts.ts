/* eslint-disable no-unused-vars -- param names in interface are for typing */
import { useEffect } from "react";
import type { FormItem } from "../utils";

interface UseAutoLoadItemCostsParams {
  tipo: string;
  itens: Array<FormItem & { custo_fetch_tentado?: boolean }>;
  onUpdateItem: (
    idx: number,
    patch: Partial<FormItem & { custo_carregando?: boolean; custo_fetch_tentado?: boolean }>
  ) => void;
}
import { fetchSaldoDetalhado, fetchSaldoFifoDetalhado } from "../service";

/**
 * useAutoLoadItemCosts
 * Carrega custos (FIFO + legacy) para itens de VENDA que ainda não possuem custo.
 * Marca flags de carregamento e evita chamadas duplicadas via custo_fetch_tentado.
 */
export function useAutoLoadItemCosts({ tipo, itens, onUpdateItem }) {
  useEffect(() => {
    if (tipo !== "VENDA") return;
    (itens || []).forEach((it, idx) => {
      if (!it) return;
      const hasProduto = !!it.produto_id;
      const temCustos =
        (it.custo_fifo_unitario != null && it.custo_fifo_unitario > 0) ||
        (it.custo_base_unitario != null && it.custo_base_unitario > 0);
      const jaTentou = it.custo_fetch_tentado;
      if (hasProduto && !temCustos && !jaTentou) {
        onUpdateItem(idx, {
          custo_carregando: true,
          custo_fetch_tentado: true,
        });
        Promise.all([
          fetchSaldoDetalhado(Number(it.produto_id)),
          fetchSaldoFifoDetalhado(Number(it.produto_id)),
        ])
          .then(([det, fifo]) => {
            const cmf = fifo.custo_medio_fifo;
            const custoFifo =
              cmf != null && Number.isFinite(cmf) && cmf > 0 ? cmf : null;
            const baseLegacy = (() => {
              const cm = Number(det.custo_medio);
              const ult = Number(det.ultimo_custo);
              if (Number.isFinite(cm) && cm > 0) return cm;
              if (Number.isFinite(ult) && ult > 0) return ult;
              return null;
            })();
            onUpdateItem(idx, {
              custo_fifo_unitario: custoFifo,
              custo_base_unitario: baseLegacy,
              produto_saldo: det.saldo ?? it.produto_saldo ?? null,
              custo_carregando: false,
            });
          })
          .catch(() => {
            onUpdateItem(idx, { custo_carregando: false });
          });
      }
    });
  }, [tipo, itens, onUpdateItem]);
}

export default useAutoLoadItemCosts;
