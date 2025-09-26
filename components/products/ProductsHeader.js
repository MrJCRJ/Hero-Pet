import React from "react";

export default function ProductsHeader() {
  return (
    <thead className="bg-[var(--color-bg-secondary)]">
      <tr>
        <th className="p-2">Nome</th>
        <th className="p-2">Categoria</th>
        <th className="p-2 w-[160px] max-w-[160px]">Fornecedores</th>
        <th className="p-2">Preço</th>
        <th className="p-2">Estoque</th>
        <th className="p-2 w-1">Ações</th>
      </tr>
    </thead>
  );
}
