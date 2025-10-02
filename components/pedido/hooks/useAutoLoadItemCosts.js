import { useEffect } from 'react';
import { fetchSaldoDetalhado, fetchSaldoFifoDetalhado } from '../service';

/**
 * useAutoLoadItemCosts
 * Carrega custos (FIFO + legacy) para itens de VENDA que ainda não possuem custo.
 * Marca flags de carregamento e evita chamadas duplicadas via custo_fetch_tentado.
 */
export function useAutoLoadItemCosts({ tipo, itens, onUpdateItem }) {
  useEffect(() => {
    if (tipo !== 'VENDA') return;
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
          fetchSaldoDetalhado(it.produto_id),
          fetchSaldoFifoDetalhado(it.produto_id),
        ])
          .then(([det, fifo]) => {
            const custoFifo =
              Number.isFinite(fifo.custo_medio_fifo) && fifo.custo_medio_fifo > 0
                ? fifo.custo_medio_fifo
                : null;
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
