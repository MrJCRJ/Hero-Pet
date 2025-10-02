import { useCallback, useState } from "react";
import { MSG } from "components/common/messages";
import { toastError } from "components/entities/shared/toast";

export function useProductToggle({ refresh, push }) {
  const [pendingToggle, setPendingToggle] = useState(null); // { action, product }

  const openInactivate = useCallback((p) => {
    if (!p?.id) return;
    setPendingToggle({ action: "inactivate", product: p });
  }, []);

  const openReactivate = useCallback((p) => {
    if (!p?.id) return;
    setPendingToggle({ action: "reactivate", product: p });
  }, []);

  const cancelToggle = useCallback(() => setPendingToggle(null), []);

  const confirmToggle = useCallback(async () => {
    if (!pendingToggle) return;
    const p = pendingToggle.product;
    try {
      if (pendingToggle.action === "inactivate") {
        const resp = await fetch(`/api/v1/produtos/${p.id}`, {
          method: "DELETE",
        });
        if (!resp.ok) throw new Error(await resp.text());
      } else {
        const resp = await fetch(`/api/v1/produtos/${p.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: p.nome,
            categoria: p.categoria || null,
            ativo: true,
          }),
        });
        if (!resp.ok) throw new Error(await resp.text());
      }
      setPendingToggle(null);
      refresh();
      push(
        pendingToggle.action === "inactivate"
          ? MSG.PROD_INACTIVATED
          : MSG.PROD_REACTIVATED,
        { type: "success" },
      );
    } catch (e) {
      toastError(push, e, MSG.PROD_TOGGLE_ERROR);
      setPendingToggle(null);
    }
  }, [pendingToggle, push, refresh]);

  return {
    pendingToggle,
    openInactivate,
    openReactivate,
    cancelToggle,
    confirmToggle,
  };
}
