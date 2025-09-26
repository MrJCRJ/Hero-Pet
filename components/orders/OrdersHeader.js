import React from "react";

export default function OrdersHeader() {
  return (
    <thead>
      <tr className="bg-[var(--color-bg-secondary)]">
        <th className="text-left px-3 py-2">Tipo</th>
        <th className="text-left px-3 py-2 w-[160px] max-w-[160px]">
          Parceiro
        </th>
        <th className="text-left px-3 py-2">Emissão</th>
        <th className="text-center px-3 py-2">NF</th>
        <th className="text-center px-3 py-2" title="Duplicadas">
          Dupl.
        </th>
        <th className="text-right px-3 py-2">Total</th>
        <th className="text-center px-3 py-2">Parcelas</th>
        <th className="text-center px-3 py-2 w-10">Ações</th>
      </tr>
    </thead>
  );
}
