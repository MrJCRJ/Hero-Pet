import { useCallback, useEffect, useState } from "react";
import { MSG } from "components/common/messages";

// Hook responsável por carregar e controlar o modal de ranking de produtos por lucro.
export function useProductRanking({
  autoPrefetch = true,
  defaultMonths = 6,
} = {}) {
  const [topData, setTopData] = useState(null);
  const [topLoading, setTopLoading] = useState(false);
  const [showTopModal, setShowTopModal] = useState(false);

  const fetchTopProdutos = useCallback(
    async (params = {}) => {
      const month = new Date();
      const yyyyMM = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
      const qs = new URLSearchParams();
      qs.set("month", params.month || yyyyMM);
      qs.set("topN", String(params.topN || 10));
      qs.set("productMonths", String(params.productMonths || defaultMonths));
      setTopLoading(true);
      try {
        const resp = await fetch(`/api/v1/produtos/top?${qs.toString()}`, {
          cache: "no-store",
        });
        if (!resp.ok) throw new Error(MSG.GENERIC_ERROR);
        const json = await resp.json();
        setTopData(json);
      } catch (e) {
        console.warn("Erro carregando top produtos", e);
        setTopData(null);
      } finally {
        setTopLoading(false);
      }
    },
    [defaultMonths],
  );

  useEffect(() => {
    if (autoPrefetch) fetchTopProdutos();
  }, [autoPrefetch, fetchTopProdutos]);

  const openTopModal = useCallback(() => setShowTopModal(true), []);
  const closeTopModal = useCallback(() => setShowTopModal(false), []);

  return {
    topData,
    topLoading,
    showTopModal,
    openTopModal,
    closeTopModal,
    fetchTopProdutos,
  };
}
