import React from "react";
import { useSaldoSync } from "./hooks";

// Centraliza efeitos colaterais do form de pedido para reduzir ruído no controller.
export function usePedidoSideEffects({
  tipo,
  itens,
  setItens,
  setTemNotaFiscal,
}) {
  // Forçar temNotaFiscal conforme política: VENDA => true, COMPRA => false
  React.useEffect(() => {
    setTemNotaFiscal(tipo === "VENDA");
  }, [tipo, setTemNotaFiscal]);

  // Sincronização de saldo (ajusta itens para venda conforme estoque)
  useSaldoSync({ tipo, itens, setItens });
}
