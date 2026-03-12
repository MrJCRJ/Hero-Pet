/* eslint-disable no-unused-vars -- param names in interface are for typing */
import React, { useState } from "react";
import { ROW_HOVER, ACTION_BTN_HIDDEN } from "components/common/tableStyles";
import { Button } from "../../ui/Button";
import { formatBRL } from "components/common/format";
import { formatYMDToBR } from "components/common/date";
import PromissoriasDots from "./PromissoriasDots";
// Removido migrateOrderToFIFO (botão de migração FIFO)

type PedidoRecord = Record<string, unknown>;

async function downloadPdf(url: string, filename: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text().catch(() => `Erro ${res.status}`));
  const blob = await res.blob();
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(u);
}

interface OrdersRowProps {
  p: PedidoRecord;
  onEdit?: (p: PedidoRecord) => void;
  onDelete?: (e: React.MouseEvent) => void;
  reload?: () => void;
  expandCell?: React.ReactNode;
}

export default function OrdersRow({
  p,
  onEdit,
  onDelete,
  reload,
  expandCell,
}: OrdersRowProps) {
  const [nfeLoading, setNfeLoading] = useState(false);
  const [nfPdfLoading, setNfPdfLoading] = useState(false);
  const [duplicatasPdfLoading, setDuplicatasPdfLoading] = useState(false);
  return (
    <tr
      className={`${ROW_HOVER} text-[12px]`}
      onClick={() => onEdit && onEdit(p)}
      tabIndex={0}
    >
      {expandCell ?? <td className="w-8 px-1 py-1.5" />}
      <td className="px-3 py-1.5 align-top whitespace-nowrap">
        {String(p.tipo ?? "")}
      </td>
      <td className="px-3 py-1.5 w-[160px] align-top">
        <div
          className="max-w-[160px] truncate whitespace-nowrap"
          title={String(p.partner_name ?? "-")}
        >
          {String(p.partner_name ?? "-")}
        </div>
      </td>
      <td className="px-3 py-1.5 whitespace-nowrap">
        {p.data_emissao ? formatYMDToBR(String(p.data_emissao)) : "-"}
      </td>
      <td className="px-3 py-1.5 text-center">
        <div className="flex items-center justify-center gap-1">
          {p.tipo === "VENDA" && p.tem_nota_fiscal ? (
            <Button
              size="sm"
              variant="outline"
              fullWidth={false}
              loading={nfPdfLoading}
              disabled={nfPdfLoading}
              className="rounded-full text-sm !px-2 !py-1 leading-none bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200"
              onClick={async (e) => {
                e.stopPropagation();
                setNfPdfLoading(true);
                try {
                  await downloadPdf(`/api/v1/pedidos/${p.id}/nf`, `NF-${p.id}.pdf`);
                } catch (err) {
                  alert((err as Error).message || "Erro ao baixar NF");
                } finally {
                  setNfPdfLoading(false);
                }
              }}
              title="Baixar NF (PDF)"
            >
              📄
            </Button>
          ) : null}
          {p.tipo === "VENDA" && p.status === "confirmado" ? (
            <Button
              size="sm"
              variant="outline"
              fullWidth={false}
              className="rounded-full text-sm !px-2 !py-1 leading-none bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200"
              disabled={nfeLoading}
              onClick={async (e) => {
                e.stopPropagation();
                setNfeLoading(true);
                try {
                  const r = await fetch(`/api/v1/pedidos/${p.id}/nfe/emitir`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: "{}",
                  });
                  const data = await r.json();
                  if (data.ok && data.chave_acesso) {
                    alert(`NF-e autorizada. Chave: ${data.chave_acesso}`);
                    reload?.();
                  } else {
                    alert(data.erro || "Erro ao emitir NF-e");
                  }
                } catch (err) {
                  alert("Erro ao emitir NF-e");
                } finally {
                  setNfeLoading(false);
                }
              }}
              title="Emitir NF-e"
            >
              {nfeLoading ? "..." : "NF-e"}
            </Button>
          ) : null}
          {p.tipo !== "VENDA" ? <span className="text-gray-400">-</span> : null}
        </div>
      </td>
      <td className="px-3 py-1.5 text-center">
          {p.tipo === "VENDA" && Number(p.numero_promissorias) >= 1 ? (
            <Button
              size="sm"
              variant="outline"
              fullWidth={false}
              loading={duplicatasPdfLoading}
              disabled={duplicatasPdfLoading}
              className="rounded-full text-sm !px-2 !py-1 leading-none bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200 focus-visible:ring-amber-500 shadow-sm"
              onClick={async (e) => {
                e.stopPropagation();
                setDuplicatasPdfLoading(true);
                try {
                  await downloadPdf(
                    `/api/v1/pedidos/${p.id}/promissorias-pdf`,
                    `Duplicatas-${p.id}.pdf`,
                  );
                } catch (err) {
                  alert((err as Error).message || "Erro ao baixar Duplicatas");
                } finally {
                  setDuplicatasPdfLoading(false);
                }
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
