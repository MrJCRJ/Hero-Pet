import React from "react";

export function ObservacaoSection({ form, onChange }) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] pb-4">
        Observações
      </h3>
      <textarea
        name="observacao"
        id="observacao"
        value={form.observacao ?? ""}
        onChange={onChange}
        placeholder="Notas, observações gerais sobre o cliente/fornecedor..."
        rows={3}
        className="block py-2.5 px-4 w-full text-sm text-[var(--color-text-primary)] border border-[var(--color-border)] rounded focus:outline-none focus:ring-1 focus:border-[var(--color-accent)] transition-colors"
      />
    </div>
  );
}
