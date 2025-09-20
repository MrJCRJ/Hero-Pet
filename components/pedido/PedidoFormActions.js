import React from "react";
import { Button } from "../ui/Button";

export function PedidoFormActions({
  created,
  editingOrder,
  onDelete,
  onClear,
  canSubmit,
  submitting
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 mt-8">
      {created?.id && (
        <span className="text-xs opacity-80 mr-auto">
          Criado: #{created.id} • Status: {created.status || 'confirmado'}
        </span>
      )}
      {editingOrder?.id && (
        <Button onClick={onDelete} variant="secondary" size="sm" fullWidth={false} disabled={submitting}>
          Excluir
        </Button>
      )}
      <Button onClick={onClear} variant="outline" size="sm" fullWidth={false} disabled={submitting}>
        Limpar
      </Button>
      <Button type="submit" variant="primary" size="sm" fullWidth={false} disabled={!canSubmit || submitting}>
        {submitting ? (editingOrder?.id ? "Atualizando..." : "Enviando...") : (editingOrder?.id ? "Atualizar Pedido" : "Criar Pedido")}
      </Button>
    </div>
  );
}