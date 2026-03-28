"use client";

/* eslint-disable no-unused-vars -- param names in interface are for typing */
import React from "react";
import { formatBRL, formatQtyBR } from "components/common/format";
import {
  TABLE_CONTAINER_SCROLL,
  TABLE_BASE,
  THEAD_STICKY,
  THEAD_ROW,
  TH_BASE,
  ACTION_TH,
  ROW_HOVER,
} from "components/common/tableStyles";
import { EstoqueAlertaBadge } from "./EstoqueAlertaBadge";

export interface SaldoRow {
  produto_id: number;
  nome: string;
  categoria: string | null;
  min_hint?: number | null;
  minimo_efetivo?: number | null;
  saldo: number;
  custo_medio: number | null;
  preco_tabela?: number | null;
  preco_medio_venda?: number | null;
}

interface EstoqueSaldosTableProps {
  rows: SaldoRow[];
  onMovimentar: (row: SaldoRow) => void;
  loading?: boolean;
}

export function EstoqueSaldosTable({
  rows,
  onMovimentar,
  loading = false,
}: EstoqueSaldosTableProps) {
  if (loading) {
    return (
      <div className="rounded border p-6 text-center text-[var(--color-text-secondary)]">
        Carregando...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded border p-6 text-center text-[var(--color-text-secondary)]">
        Nenhum produto encontrado.
      </div>
    );
  }

  return (
    <div className={TABLE_CONTAINER_SCROLL}>
      <table className={TABLE_BASE}>
        <thead className={THEAD_STICKY}>
          <tr className={THEAD_ROW}>
            <th className={TH_BASE}>Produto</th>
            <th className={TH_BASE}>Categoria</th>
            <th className="text-right px-3 py-1.5 font-semibold">Preço compra</th>
            <th className="text-right px-3 py-1.5 font-semibold">Preço venda</th>
            <th className="text-right px-3 py-1.5 font-semibold">
              P. médio venda
            </th>
            <th className="text-right px-3 py-1.5 font-semibold">Saldo atual</th>
            <th className="text-right px-3 py-1.5 font-semibold">Mínimo</th>
            <th className={ACTION_TH}>Ação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.produto_id} className={ROW_HOVER}>
              <td className="px-3 py-2">
                <div className="font-medium">{row.nome}</div>
                <div className="mt-1">
                  <EstoqueAlertaBadge
                    saldo={row.saldo}
                    estoqueMinimo={row.minimo_efetivo ?? row.min_hint}
                  />
                </div>
              </td>
              <td className="px-3 py-2 text-[var(--color-text-secondary)]">
                {row.categoria ?? "-"}
              </td>
              <td className="px-3 py-2 text-right">
                {row.custo_medio != null && Number.isFinite(row.custo_medio)
                  ? formatBRL(row.custo_medio)
                  : "-"}
              </td>
              <td className="px-3 py-2 text-right">
                {(() => {
                  const pv = row.preco_tabela;
                  const cm = row.custo_medio;
                  if (pv != null && Number.isFinite(pv) && pv >= 0)
                    return formatBRL(pv);
                  if (cm != null && Number.isFinite(cm) && cm > 0)
                    return (
                      <span title="Estimado (custo + 20%)">
                        {formatBRL(cm * 1.2)}
                      </span>
                    );
                  return "-";
                })()}
              </td>
              <td className="px-3 py-2 text-right">
                {row.preco_medio_venda != null &&
                Number.isFinite(row.preco_medio_venda)
                  ? formatBRL(row.preco_medio_venda)
                  : "-"}
              </td>
              <td className="px-3 py-2 text-right font-medium">
                {formatQtyBR(row.saldo)}
              </td>
              <td className="px-3 py-2 text-right">
                {(() => {
                  const min = row.minimo_efetivo ?? row.min_hint;
                  if (min != null && Number.isFinite(min)) {
                    return (
                      <span title="Sugerido (consumo 30 dias)">
                        {formatQtyBR(min)}
                        <span className="text-[10px] opacity-60 ml-1">(30d)</span>
                      </span>
                    );
                  }
                  return "-";
                })()}
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  type="button"
                  onClick={() => onMovimentar(row)}
                  className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                >
                  Movimentar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
