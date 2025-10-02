import React from "react";
import { Button } from "../../ui/Button";

export function QuickAddAddButton({
  tipo,
  displaySaldo,
  quantidade,
  produtoId,
  onAdd,
}) {
  const disabled =
    (tipo === "VENDA" &&
      displaySaldo != null &&
      Number.isFinite(Number(quantidade)) &&
      Number(quantidade) > Number(displaySaldo)) ||
    !produtoId ||
    !Number.isFinite(Number(quantidade)) ||
    Number(quantidade) <= 0;

  const title =
    tipo === "VENDA" &&
    displaySaldo != null &&
    Number.isFinite(Number(quantidade)) &&
    Number(quantidade) > Number(displaySaldo)
      ? "Estoque insuficiente"
      : "Adicionar item";

  return (
    <div className="text-right">
      <Button
        variant="primary"
        size="sm"
        fullWidth={false}
        className="px-2 py-1"
        onClick={onAdd}
        aria-label="Adicionar item"
        title={title}
        disabled={disabled}
        icon={(props) => (
          <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 5a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H6a1 1 0 110-2h5V6a1 1 0 011-1z" />
          </svg>
        )}
      />
    </div>
  );
}
