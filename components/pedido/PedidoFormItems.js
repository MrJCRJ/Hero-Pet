import React from "react";
import { Button } from "../ui/Button";
import { SelectionModal } from "../common/SelectionModal";
import { formatQty } from "./utils";
import { QuickAddItemRow } from "./QuickAddItemRow";
import { fetchSaldo as fetchSaldoService } from "./service";
import { formatBRL } from "components/common/format";

export function PedidoFormItems(props) {
  const {
    itens,
    onUpdateItem,
    onAddItem,
    onRemoveItem,
    tipo,
    partnerId,
    computeItemTotal,
    getItemDiffClass,
    getItemDiffIcon,
    getItemChanges,
    originalItens,
    editingOrder,
    productModalIndex,
    onSetProductModalIndex,
    fetchProdutos,
    freteTotal,
    setFreteTotal,
  } = props;

  const totalItens = React.useMemo(() => {
    try {
      return (itens || []).reduce((acc, it) => {
        const t = computeItemTotal ? computeItemTotal(it) : null;
        const n = t != null && Number.isFinite(Number(t)) ? Number(t) : 0;
        return acc + n;
      }, 0);
    } catch (_) {
      return 0;
    }
  }, [itens, computeItemTotal]);

  const freteShares = React.useMemo(() => {
    if (tipo !== "COMPRA") return itens.map(() => 0);
    const totalFrete = Number(freteTotal || 0);
    if (!Number.isFinite(totalFrete) || totalFrete <= 0) return itens.map(() => 0);
    const quants = itens.map((it) => {
      const qtd = Number(it?.quantidade);
      return Number.isFinite(qtd) && qtd > 0 ? qtd : 0;
    });
    const sumQtd = quants.reduce((acc, q) => acc + (Number.isFinite(q) ? q : 0), 0);
    if (!Number.isFinite(sumQtd) || sumQtd <= 0) return itens.map(() => 0);
    const raw = quants.map((q) => (q > 0 ? (totalFrete * q) / sumQtd : 0));
    const rounded = raw.map((v) => Number(v.toFixed(2)));
    const sumRounded = rounded.reduce((a, b) => a + b, 0);
    let diff = Number((totalFrete - sumRounded).toFixed(2));
    if (diff !== 0) {
      let idx = 0;
      let maxQtd = -Infinity;
      for (let i = 0; i < quants.length; i++) {
        if (quants[i] > maxQtd) {
          maxQtd = quants[i];
          idx = i;
        }
      }
      rounded[idx] = Number((rounded[idx] + diff).toFixed(2));
    }
    return rounded;
  }, [tipo, freteTotal, itens]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Itens</h3>
      </div>
      <QuickAddItemRow
        tipo={tipo}
        partnerId={partnerId}
        itens={itens}
        onUpdateItem={onUpdateItem}
        onAddItem={onAddItem}
        onAppend={(row) => {
          const newRow = {
            produto_id: String(row.produto_id || ""),
            produto_label: row.produto_label || "",
            quantidade: String(row.quantidade || ""),
            preco_unitario: String(row.preco_unitario ?? ""),
            desconto_unitario: String(row.desconto_unitario ?? ""),
            produto_saldo: null,
          };
          const emptyIdx = itens.findIndex((r) => !r.produto_id);
          if (emptyIdx >= 0) {
            onUpdateItem(emptyIdx, newRow);
          } else {
            const currentLen = itens.length;
            onAddItem();
            setTimeout(() => onUpdateItem(currentLen, newRow), 0);
          }
        }}
        fetchProdutos={fetchProdutos}
      />

      {editingOrder && originalItens.length > 0 && (() => {
        const changes = getItemChanges();
        return (
          changes.removed.length > 0 && (
            <div className="mb-4 p-3 border border-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Itens removidos ({changes.removed.length}):
              </h4>
              {changes.removed.map((removedItem, idx) => (
                <div key={idx} className="text-sm text-red-700 dark:text-red-300">
                  •{" "}
                  {removedItem.produto_label || `Produto ID: ${removedItem.produto_id}`}
                  - Qtd: {removedItem.quantidade}- Preço: {formatBRL(Number(removedItem.preco_unitario || 0))}
                </div>
              ))}
            </div>
          )
        );
      })()}

      <div className="divide-y border rounded-md">
        {itens.map((it, idx) => (
          <div key={idx} className={`flex items-center gap-2 p-2 ${getItemDiffClass(it) || ""}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {it.produto_label || "Produto não selecionado"}
                </span>
                {getItemDiffIcon(it)}
              </div>
            </div>
            <div className="w-24 text-right text-sm">Qtd: {formatQty(it.quantidade)}</div>
            <div className="w-28 text-right text-sm">
              Preço: {it.preco_unitario !== "" ? formatBRL(Number(it.preco_unitario)) : "—"}
            </div>
            <div className="w-28 text-right text-sm">
              Desc.: {it.desconto_unitario !== "" ? formatBRL(Number(it.desconto_unitario)) : "—"}
            </div>
            <div className="w-28 text-right font-semibold">
              {(() => {
                const t = computeItemTotal(it);
                return t != null ? formatBRL(Number(t)) : "—";
              })()}
            </div>
            {tipo === "COMPRA" && Number(freteTotal || 0) > 0 ? (
              <div className="w-28 text-right text-xs whitespace-nowrap">
                Frete: {formatBRL(Number(freteShares?.[idx] || 0))}
              </div>
            ) : null}
            <div className="w-10 text-right">
              <Button
                variant="secondary"
                size="sm"
                fullWidth={false}
                onClick={() => onRemoveItem(idx)}
                aria-label="Remover item"
                className="px-2 py-1 text-white"
                title="Remover item"
                icon={(props) => (
                  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12m-9 4v6m6-6v6M9 7l1-2h4l1 2m-9 0h12l-1 12a2 2 0 01-2 2H8a2 2 0 01-2-2L5 7z" />
                  </svg>
                )}
              />
            </div>
          </div>
        ))}
      </div>

      {tipo === "COMPRA" && (
        <div className="flex justify-end mt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Frete</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">R$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                className="w-28 pl-6 pr-2 py-1 text-right border rounded bg-[var(--color-bg-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                aria-label="Frete"
                value={freteTotal}
                onChange={(e) => setFreteTotal(e.target.value)}
                onBlur={(e) => {
                  const v = String(e.target.value || "");
                  const num = Number(v.replace(",", "."));
                  if (Number.isFinite(num)) setFreteTotal(num.toFixed(2));
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end mt-3">
        <div className="text-right text-sm font-semibold">
          {(() => {
            const freteVal = tipo === "COMPRA" ? Number(freteTotal || 0) : 0;
            const total = Number(totalItens || 0) + (Number.isFinite(freteVal) ? freteVal : 0);
            return `Total: ${formatBRL(total)}`;
          })()}
        </div>
      </div>

      {Number.isInteger(productModalIndex) && productModalIndex >= 0 && (
        <SelectionModal
          title="Selecionar Produto"
          fetcher={fetchProdutos}
          extractLabel={(it) => it.label}
          onSelect={(it) => {
            const targetIndex = productModalIndex;
            onSetProductModalIndex(null);
            if (it && Number.isInteger(targetIndex)) {
              onUpdateItem(targetIndex, {
                produto_id: String(it.id),
                produto_label: it.label,
                produto_saldo: null,
              });
              if (tipo === "VENDA") {
                fetchSaldoService(it.id)
                  .then((saldo) => {
                    onUpdateItem(targetIndex, { produto_saldo: saldo });
                  })
                  .catch(() => {
                    onUpdateItem(targetIndex, { produto_saldo: null });
                  });
              }
            }
          }}
          onClose={() => onSetProductModalIndex(null)}
          emptyMessage={tipo === "COMPRA" ? "Este fornecedor não possui produtos relacionados" : "Nenhum produto encontrado"}
          footer={
            tipo === "COMPRA" && Number.isFinite(Number(partnerId)) ? (
              <button
                type="button"
                className="text-xs px-2 py-1 border rounded hover:bg-[var(--color-bg-secondary)]"
                onClick={() => {
                  const target = `#tab=products&linkSupplierId=${Number(partnerId)}`;
                  try {
                    window.location.hash = target;
                  } catch (_) {
                    /* noop */
                  }
                  onSetProductModalIndex(null);
                }}
              >
                + Vincular produto ao fornecedor
              </button>
            ) : null
          }
        />
      )}
    </div>
  );
}
