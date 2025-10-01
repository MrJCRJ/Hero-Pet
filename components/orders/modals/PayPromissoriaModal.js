import React from "react";
import { Button } from "../../ui/Button";
import { Modal } from "../../common/Modal";
import { useToast } from "../../entities/shared/toast";

export default function PayPromissoriaModal({
  pedidoId,
  seq,
  dueDate,
  defaultPaidDate,
  onClose,
  onSuccess,
}) {
  const [paidDate, setPaidDate] = React.useState(defaultPaidDate || "");
  const [submitting, setSubmitting] = React.useState(false);
  const { push } = useToast();

  // (sem logs de teste)

  const save = async () => {
    if (!paidDate || !/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) {
      push("Data de pagamento inválida (YYYY-MM-DD)", { type: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/pedidos/${pedidoId}/promissorias/${seq}?action=pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paid_date: paidDate }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Falha ao marcar como pago");
      push("Promissória marcada como paga!", { type: "success" });
      onSuccess?.();
      onClose?.();
    } catch (e) {
      push(e.message || "Erro ao marcar como pago", { type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Marcar Pago • Parcela #${seq}`}
      onClose={onClose}
      maxWidth="max-w-md"
    >
      <div className="space-y-3">
        <div className="text-sm">
          <div className="mb-1 text-xs text-gray-500">Vencimento</div>
          <div className="font-medium">
            {dueDate
              ? `${dueDate.slice(8, 10)}/${dueDate.slice(5, 7)}/${dueDate.slice(0, 4)}`
              : "-"}
          </div>
        </div>
        <div>
          <label htmlFor="paid_date" className="block text-xs mb-1">
            Data do Pagamento
          </label>
          <input
            id="paid_date"
            type="date"
            className="border rounded px-2 py-1 w-full text-sm  bg-[var(--color-bg-primary)] border-[var(--color-border)] calendar-icon-white fallback-icon cursor-pointer"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" fullWidth={false} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            fullWidth={false}
            onClick={save}
            loading={submitting}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
