import React from "react";
import { ROW_HOVER, ACTION_BTN_HIDDEN } from "components/common/tableStyles";
import { Button } from "../ui/Button";
import { formatBRL } from "components/common/format";
import { formatYMDToBR } from "components/common/date";
import PromissoriasDots from "./PromissoriasDots";
// Removido migrateOrderToFIFO (botão de migração FIFO)

export default function OrdersRow({ p, onEdit, onDelete, reload }) {
  const fifoBadge = (() => {
    if (p.tipo === "COMPRA") return null;
    const st = p.fifo_state;
    if (!st) return null;
    const base =
      "inline-block px-2 py-[2px] rounded text-[10px] font-medium tracking-wide border";
    if (st === "fifo")
      return (
        <span
          className={
            base +
            " bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700"
          }
          title="FIFO aplicado"
        >
          FIFO
        </span>
      );
    if (st === "eligible") return null; // Badge de elegibilidade removida
    return (
      <span
        className={
          base +
          " bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
        }
        title="Consumo médio (legacy)"
      >
        LEGACY
      </span>
    );
  })();
  return (
    <tr
      className={`${ROW_HOVER} text-[12px]`}
      onClick={() => onEdit && onEdit(p)}
      tabIndex={0}
    >
      <td className="px-3 py-1.5 align-top whitespace-nowrap">{p.tipo}</td>
      <td className="px-3 py-1.5 w-[160px] align-top">
        <div
          className="max-w-[160px] truncate whitespace-nowrap"
          title={p.partner_name || "-"}
        >
          {p.partner_name || "-"}
        </div>
        {fifoBadge && (
          <div className="mt-1 flex items-center gap-2">{fifoBadge}</div>
        )}
      </td>
      <td className="px-3 py-1.5 whitespace-nowrap">
        {p.data_emissao ? formatYMDToBR(p.data_emissao) : "-"}
      </td>
      <td className="px-3 py-1.5 text-center">
        {p.tipo === "VENDA" && p.tem_nota_fiscal ? (
          <Button
            size="sm"
            variant="outline"
            fullWidth={false}
            className="rounded-full text-sm !px-2 !py-1 leading-none bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200 focus-visible:ring-blue-500 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();

              window.open(`/api/v1/pedidos/${p.id}/nf`, "_blank", "noopener");
            }}
            title="Baixar NF (PDF)"
          >
            📄
          </Button>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-3 py-1.5 text-center">
        {p.tipo === "VENDA" && Number(p.numero_promissorias) >= 1 ? (
          <Button
            size="sm"
            variant="outline"
            fullWidth={false}
            className="rounded-full text-sm !px-2 !py-1 leading-none bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200 focus-visible:ring-amber-500 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();

              window.open(
                `/api/v1/pedidos/${p.id}/promissorias-pdf`,
                "_blank",
                "noopener",
              );
            }}
            title="Baixar Duplicadas (PDF)"
          >
            📝
          </Button>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-3 py-1.5 text-right">
        {(() => {
          const tl = p.total_liquido != null ? Number(p.total_liquido) : NaN;
          const ft = p.frete_total != null ? Number(p.frete_total) : 0;
          const totalComFrete =
            (Number.isFinite(tl) ? tl : 0) + (Number.isFinite(ft) ? ft : 0);
          const totalFmt = Number.isFinite(totalComFrete)
            ? formatBRL(Number(totalComFrete))
            : "-";
          const pago = p.total_pago != null ? Number(p.total_pago) : 0;
          const pagoFmt = Number.isFinite(pago)
            ? formatBRL(Number(pago))
            : formatBRL(0);
          const fullyPaid =
            Number.isFinite(totalComFrete) && Number.isFinite(pago)
              ? Math.abs(pago - totalComFrete) < 0.005 || pago > totalComFrete
              : false;
          return (
            <div className="text-right">
              <div>{totalFmt}</div>
              {!fullyPaid && (
                <div className="text-xs text-blue-600 dark:text-blue-300">
                  Pago: {pagoFmt}
                </div>
              )}
            </div>
          );
        })()}
      </td>
      <td className="px-3 py-1.5 text-center">
        <PromissoriasDots
          pedidoId={p.id}
          count={p.numero_promissorias}
          onChanged={reload}
        />
      </td>
      <td className="px-3 py-1.5 text-center">
        <div className="flex items-center justify-center">
          <button
            type="button"
            title="Excluir pedido"
            aria-label="Excluir pedido"
            onClick={(e) => {
              e.stopPropagation();
              onDelete && onDelete(e);
            }}
            className={`${ACTION_BTN_HIDDEN} h-6 w-6 flex items-center justify-center rounded border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 hover:ring-2 hover:ring-red-400/40`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              className="h-4 w-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 3h6m-9 4h12m-10 3v7m4-7v7M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"
              />
            </svg>
          </button>
        </div>
      </td>
    </tr>
  );
}
