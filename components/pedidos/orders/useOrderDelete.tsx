import React, { useState, useCallback } from "react";
import { useToast } from "../../entities/shared/toast";
import { deleteOrder as deleteOrderService } from "../service";
import { ConfirmDialog } from "../../common/ConfirmDialog";
import { MSG } from "components/common/messages";

export function useOrderDelete({ onDeleted }) {
  const { push } = useToast();
  const [confirmingOrder, setConfirmingOrder] = useState<{ id: number } | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const requestDelete = useCallback((pedido, e) => {
    e?.stopPropagation?.();
    setConfirmingOrder(pedido);
  }, []);

  const performDelete = useCallback(async () => {
    if (!confirmingOrder) return;
    try {
      setDeleting(true);
      await deleteOrderService(confirmingOrder.id);
      push(MSG.ORDER_DELETED_SUCCESS(confirmingOrder.id), { type: "success" });
      setConfirmingOrder(null);
      await onDeleted?.();
    } catch (err) {
      push(err.message || MSG.PEDIDO_DELETE_ERROR, { type: "error" });
    } finally {
      setDeleting(false);
    }
  }, [confirmingOrder, onDeleted, push]);

  const dialog = confirmingOrder ? (
    <ConfirmDialog
      title={MSG.ORDER_DELETE_CONFIRM_TITLE(confirmingOrder.id)}
      message={MSG.ORDER_DELETE_CONFIRM_MESSAGE(confirmingOrder.id)}
      confirmLabel="Excluir"
      cancelLabel="Cancelar"
      danger
      loading={deleting}
      onCancel={() => !deleting && setConfirmingOrder(null)}
      onConfirm={performDelete}
    />
  ) : null;

  return { requestDelete, dialog };
}
