import React from "react";

export default function ProductsHeader() {
  return (
    <thead className="sticky top-0 z-10 shadow-sm after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-[-6px] after:h-4 after:pointer-events-none after:bg-gradient-to-b after:from-[var(--color-bg-secondary)]/70 after:to-transparent">
      <tr className="relative bg-[var(--color-bg-secondary)]/95 backdrop-blur text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
        <th className="text-left px-3 py-1.5 font-semibold">Nome</th>
        <th className="text-left px-3 py-1.5 font-semibold">Categoria</th>
        <th className="text-left px-3 py-1.5 w-[160px] max-w-[160px] font-semibold">Fornecedores</th>
        <th className="text-left px-3 py-1.5 font-semibold">Preço</th>
        <th className="text-left px-3 py-1.5 font-semibold">Estoque</th>
        <th className="text-center px-3 py-1.5 w-10 font-semibold">Ações</th>
      </tr>
    </thead>
  );
}
