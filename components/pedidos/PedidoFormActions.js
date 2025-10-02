import React from "react";
import { Button } from "../ui/Button";

export function PedidoFormActions({
  editingOrder,
  onDelete,
  canSubmit,
  submitting,
  fifoAplicado,
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 mt-8">
      {/* Informações de criação removidas conforme solicitação */}
      {editingOrder?.id && fifoAplicado === false && (
        <span className="text-[10px] px-2 py-1 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/40 uppercase tracking-wide font-semibold mr-auto">
          LEGACY CUSTO
        </span>
      )}
      {editingOrder?.id && (
        <Button
          onClick={onDelete}
          variant="secondary"
          size="sm"
          fullWidth={false}
          disabled={submitting}
        >
          Excluir
        </Button>
      )}
      {/* Botão 'Limpar' removido conforme solicitação */}
      <Button
        type="submit"
        variant="primary"
        size="sm"
        fullWidth={false}
        disabled={!canSubmit || submitting}
      >
        {submitting
          ? editingOrder?.id
            ? "Atualizando..."
            : "Enviando..."
          : editingOrder?.id
            ? "Atualizar Pedido"
            : "Criar Pedido"}
      </Button>
    </div>
  );
}
