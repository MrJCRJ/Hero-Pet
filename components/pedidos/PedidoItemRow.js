import React from "react";
import { Button } from "../ui/Button";
import { formatBRL } from "components/common/format";
import { formatQty } from "./utils";

/**
 * Linha de item do Pedido (apenas render). Lógica de cálculo fica em utils / hooks.
 */
export function PedidoItemRow({
  it,
  idx,
  tipo,
  computeItemTotal,
  getItemDiffClass,
  getItemDiffIcon,
  onRemoveItem,
  freteShares,
  freteTotal,
}) {
  return (
    <tr key={idx} className={`${getItemDiffClass(it) || ""}`}>
      <td className="px-2 py-2 max-w-[240px]">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {it.produto_label || "Produto não selecionado"}
          </span>
          {getItemDiffIcon(it)}
        </div>
      </td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        {formatQty(it.quantidade)}
      </td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        {it.preco_unitario !== "" ? formatBRL(Number(it.preco_unitario)) : "—"}
      </td>
      <td className="px-2 py-2 text-right whitespace-nowrap">
        {it.desconto_unitario !== ""
          ? formatBRL(Number(it.desconto_unitario))
          : "—"}
      </td>
      <td className="px-2 py-2 text-right font-semibold whitespace-nowrap">
        {(() => {
          const t = computeItemTotal(it);
          return t != null ? formatBRL(Number(t)) : "—";
        })()}
      </td>
      {tipo === "VENDA" && (
        <td className="px-2 py-2 text-right whitespace-nowrap">
          {(() => {
            if (it.custo_carregando) {
              return (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <span
                    className="inline-block w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"
                    aria-label="Carregando lucro"
                  />
                  <span>…</span>
                </span>
              );
            }
            const qtd = Number(it.quantidade || 0);
            const preco =
              Number(it.preco_unitario || 0) -
              Number(it.desconto_unitario || 0);
            const custoRaw = Number(
              it.custo_fifo_unitario != null
                ? it.custo_fifo_unitario
                : it.custo_base_unitario,
            );
            if (!Number.isFinite(qtd) || qtd <= 0) return "—";
            if (!Number.isFinite(preco) || preco <= 0) return "—";
            if (!Number.isFinite(custoRaw) || custoRaw <= 0) return "—";
            const lucro = (preco - custoRaw) * qtd;
            const cls =
              lucro > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : lucro < 0
                  ? "text-red-600 dark:text-red-400"
                  : "opacity-70";
            return <span className={cls}>{formatBRL(lucro)}</span>;
          })()}
        </td>
      )}
      {tipo === "COMPRA" && Number(freteTotal || 0) > 0 && (
        <td className="px-2 py-2 text-right text-xs whitespace-nowrap">
          {formatBRL(Number(freteShares?.[idx] || 0))}
        </td>
      )}
      <td className="px-2 py-2 text-right">
        <Button
          variant="secondary"
          size="sm"
          fullWidth={false}
          onClick={() => onRemoveItem(idx)}
          aria-label="Remover item"
          className="px-2 py-1 text-white"
          title="Remover item"
          icon={(props) => (
            <svg
              {...props}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 7h12m-9 4v6m6-6v6M9 7l1-2h4l1 2m-9 0h12l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7z"
              />
            </svg>
          )}
        />
      </td>
    </tr>
  );
}

export default PedidoItemRow;
