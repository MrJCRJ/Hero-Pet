import React, { useState } from "react";
import OrdersRow from "components/pedidos/orders/OrdersRow";
import { ChevronDown, ChevronRight } from "lucide-react";
import { formatBRL } from "components/common/format";

/* eslint-disable no-unused-vars -- param names in interface are for typing */
interface PedidoListRowProps {
  p: Record<string, unknown>;
  onEdit?: (_p: Record<string, unknown>) => void;
  reload?: () => void;
  onDelete?: (_e: React.MouseEvent) => void;
}

export default function PedidoListRow(props: PedidoListRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<{ itens?: Array<Record<string, unknown>> } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (expanded) {
      setExpanded(false);
      return;
    }
    if (!detail && !loadingDetail) {
      setLoadingDetail(true);
      fetch(`/api/v1/pedidos/${(props.p as { id: number }).id}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          setDetail(data);
          setExpanded(true);
        })
        .catch(() => setLoadingDetail(false))
        .finally(() => setLoadingDetail(false));
    } else {
      setExpanded(true);
    }
  };

  const itens = detail?.itens ?? [];
  const detailRow =
    expanded && itens.length > 0 ? (
      <tr className="bg-[var(--color-bg-secondary)]/50">
        <td colSpan={9} className="px-4 py-3 border-b border-[var(--color-border)]">
          <div className="text-xs space-y-2">
            <div className="font-medium text-[var(--color-text-secondary)]">Itens do pedido</div>
            <table className="w-full max-w-2xl text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-1">Produto</th>
                  <th className="text-right py-1">Qtd</th>
                  <th className="text-right py-1">Unit.</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((it, i) => (
                  <tr key={i} className="border-b border-[var(--color-border)]/50">
                    <td className="py-1">{String(it.produto_nome ?? it.nome ?? "-")}</td>
                    <td className="text-right py-1">{Number(it.quantidade ?? 0)}</td>
                    <td className="text-right py-1">{formatBRL(Number(it.preco_unitario ?? 0))}</td>
                    <td className="text-right py-1">{formatBRL(Number(it.total_item ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    ) : null;

  const expandCell = (
    <td
      className="w-8 px-1 py-1.5 align-middle cursor-pointer hover:bg-[var(--color-bg-secondary)]"
      onClick={handleExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleExpand(e as unknown as React.MouseEvent)}
      aria-expanded={expanded}
    >
      {loadingDetail ? (
        <span className="text-xs">...</span>
      ) : expanded ? (
        <ChevronDown className="h-4 w-4 text-[var(--color-text-secondary)]" />
      ) : (
        <ChevronRight className="h-4 w-4 text-[var(--color-text-secondary)]" />
      )}
    </td>
  );

  return (
    <>
      <OrdersRow {...props} expandCell={expandCell} />
      {detailRow}
    </>
  );
}
