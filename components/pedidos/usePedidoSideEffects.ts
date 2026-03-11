import React from "react";
import { useSaldoSync } from "./hooks";
import type { FormItem } from "./utils";

export interface UsePedidoSideEffectsParams {
  tipo: string;
  itens: FormItem[];
  setItens: React.Dispatch<React.SetStateAction<FormItem[]>>;
  setTemNotaFiscal: React.Dispatch<React.SetStateAction<boolean>>;
}

export function usePedidoSideEffects({
  tipo,
  itens,
  setItens,
  setTemNotaFiscal,
}: UsePedidoSideEffectsParams) {
  // Forçar temNotaFiscal conforme política: VENDA => true, COMPRA => false
  React.useEffect(() => {
    setTemNotaFiscal(tipo === "VENDA");
  }, [tipo, setTemNotaFiscal]);

  // Sincronização de saldo (ajusta itens para venda conforme estoque)
  useSaldoSync({ tipo, itens, setItens });
}
