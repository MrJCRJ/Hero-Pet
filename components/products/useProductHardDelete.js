import { useCallback, useState } from "react";
import { MSG } from "components/common/messages";
import { criticalError } from "components/entities/shared/toast";

// Hook para controlar exclusão definitiva de produto
export function useProductHardDelete({ refresh, push, password = "98034183" }) {
  const [hardDeleteTarget, setHardDeleteTarget] = useState(null);
  const [hardDeletePwd, setHardDeletePwd] = useState("");
  const [hardDeleting, setHardDeleting] = useState(false);

  const openHardDelete = useCallback((product) => {
    if (!product?.id) return;
    setHardDeleteTarget(product);
    setHardDeletePwd("");
  }, []);

  const cancelHardDelete = useCallback(() => {
    if (hardDeleting) return;
    setHardDeleteTarget(null);
    setHardDeletePwd("");
  }, [hardDeleting]);

  const confirmHardDelete = useCallback(async () => {
    if (!hardDeleteTarget) return;
    if (hardDeletePwd !== password) {
      push("Senha inválida", { type: "error" });
      return;
    }
    try {
      setHardDeleting(true);
      const resp = await fetch(`/api/v1/produtos/${hardDeleteTarget.id}?hard=true&password=${encodeURIComponent(hardDeletePwd)}`, { method: "DELETE" });
      if (!resp.ok) {
        const txt = await resp.text();
        push(`${MSG.PROD_DELETE_ERROR}: ${resp.status} ${txt}`.trim(), { type: "error", assertive: true });
        return;
      }
      setHardDeleteTarget(null);
      setHardDeletePwd("");
      refresh();
      push(MSG.PROD_HARD_DELETED, { type: "success" });
    } catch (e) {
      criticalError(push, e, MSG.PROD_DELETE_ERROR);
    } finally {
      setHardDeleting(false);
    }
  }, [hardDeleteTarget, hardDeletePwd, password, push, refresh]);

  return {
    hardDeleteTarget,
    hardDeletePwd,
    hardDeleting,
    setHardDeletePwd,
    openHardDelete,
    cancelHardDelete,
    confirmHardDelete,
  };
}
