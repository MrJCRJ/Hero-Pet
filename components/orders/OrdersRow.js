import React from "react";
import { Button } from "../ui/Button";
import { formatBRL } from "components/common/format";
import { formatYMDToBR } from "components/common/date";
import PromissoriasDots from "./PromissoriasDots";

export default function OrdersRow({ p, onEdit, onDelete, reload }) {
  return (
    <tr
      className="border-t hover:bg-[var(--color-bg-secondary)] cursor-pointer"
      onClick={() => onEdit && onEdit(p)}
    >
      <td className="px-3 py-2">{p.tipo}</td>
      <td className="px-3 py-2 w-[160px] align-top">
        <div
          className="max-w-[160px] truncate whitespace-nowrap"
          title={p.partner_name || "-"}
        >
          {p.partner_name || "-"}
        </div>
      </td>
      <td className="px-3 py-2">
        {p.data_emissao ? formatYMDToBR(p.data_emissao) : "-"}
      </td>
      <td className="px-3 py-2 text-center">
        {p.tipo === "VENDA" && p.tem_nota_fiscal ? (
          <Button
            size="sm"
            variant="outline"
            fullWidth={false}
            className="rounded-full text-sm !px-2 !py-1 leading-none bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200 focus-visible:ring-blue-500 shadow-sm"
            onClick={(e) => {
              e.stopPropagation();

              window.open(
                `/api/v1/pedidos/${p.id}/nf`,
                "_blank",
                "noopener",
              );
            }}
            title="Baixar NF (PDF)"
          >
            📄
          </Button>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-3 py-2 text-center">
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
      <td className="px-3 py-2 text-right">
        {(() => {
          const tl = p.total_liquido != null ? Number(p.total_liquido) : NaN;
          const ft = p.frete_total != null ? Number(p.frete_total) : 0;
          const totalComFrete = (Number.isFinite(tl) ? tl : 0) + (Number.isFinite(ft) ? ft : 0);
          const totalFmt = Number.isFinite(totalComFrete) ? formatBRL(Number(totalComFrete)) : "-";
          const pago = p.total_pago != null ? Number(p.total_pago) : 0;
          const pagoFmt = Number.isFinite(pago) ? formatBRL(Number(pago)) : formatBRL(0);
          const fullyPaid = Number.isFinite(totalComFrete) && Number.isFinite(pago)
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
      <td className="px-3 py-2 text-center">
        <PromissoriasDots pedidoId={p.id} count={p.numero_promissorias} onChanged={reload} />
      </td>
      <td className="px-3 py-2 text-center">
        <Button
          size="sm"
          variant="secondary"
          fullWidth={false}
          className="px-2 py-1 text-white"
          title="Excluir pedido"
          aria-label="Excluir pedido"
          onClick={(e) => onDelete && onDelete(e)}
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
