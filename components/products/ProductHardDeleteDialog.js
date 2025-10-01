import React from "react";
import { ConfirmDialog } from "components/common/ConfirmDialog";

// Dialog de exclusão definitiva de produto.
export function ProductHardDeleteDialog({
  target,
  password,
  setPassword,
  deleting,
  onCancel,
  onConfirm,
}) {
  if (!target) return null;
  return (
    <ConfirmDialog
      title={`Excluir DEFINITIVO • ${target.nome}`}
      message={
        <div className="space-y-4 text-sm">
          <p>
            Esta ação removerá TODOS os registros relacionados ao produto
            (movimentos, lotes, itens de pedidos, fornecedores). Não pode
            ser desfeita.
          </p>
          <input
            type="password"
            className="w-full rounded border px-3 py-2 bg-[var(--color-bg-secondary)]"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={deleting}
            autoFocus
          />
          <div className="text-[11px] opacity-60 leading-snug">
            Digite a senha para habilitar a exclusão definitiva.
          </div>
        </div>
      }
      danger
      confirmLabel={deleting ? "Excluindo..." : "Excluir"}
      cancelLabel="Cancelar"
      loading={deleting}
      onCancel={() => !deleting && onCancel()}
      onConfirm={() => {
        if (!password || deleting) return;
        onConfirm();
      }}
    />
  );
}
