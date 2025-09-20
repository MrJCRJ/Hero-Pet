import React from "react";
import { Button } from "../ui/Button";

export function PedidoFormActions({
  created,
  editingOrder,
  onDelete,
  onClear,
  canSubmit,
  submitting,
  temNotaFiscal
}) {
  const handleGerarNF = () => {
    const pedidoId = editingOrder?.id || created?.id;
    if (!pedidoId) return;

    if (!temNotaFiscal) {
      alert('Este pedido não possui nota fiscal habilitada');
      return;
    }

    // Abrir PDF em nova aba
    const url = `/api/v1/pedidos/${pedidoId}/nf`;
    window.open(url, '_blank');
  };
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
      {(editingOrder?.id || created?.id) && temNotaFiscal && (
        <Button onClick={handleGerarNF} variant="outline" size="sm" fullWidth={false} disabled={submitting}>
          📄 Gerar NF (PDF)
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