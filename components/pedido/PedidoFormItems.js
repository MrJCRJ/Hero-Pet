import React from "react";
import { SelectionModal } from "../common/SelectionModal";
// utils principais (computeItemTotal default importado abaixo)
import { computeItemTotal as defaultComputeItemTotal } from './utils';
import { computeFreteShares } from './utils';
import { useAutoLoadItemCosts } from './hooks/useAutoLoadItemCosts';
import PedidoItemRow from './PedidoItemRow';
import PedidoFormResumoLucro from './PedidoFormResumoLucro';
import { QuickAddItemRow } from "./QuickAddItemRow";
import {
  fetchLastPurchasePrice,
  fetchSaldoDetalhado,
  fetchSaldoFifoDetalhado,
} from "./service";
import { formatBRL } from "components/common/format";

export function PedidoFormItems(props) {
  const {
    itens,
    onUpdateItem,
    onAddItem,
    onRemoveItem,
    tipo,
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
    const fn = computeItemTotal || defaultComputeItemTotal;
    try {
      return (itens || []).reduce((acc, it) => {
        const t = fn(it);
        return acc + (Number.isFinite(t) ? Number(t) : 0);
      }, 0);
    } catch (_) { return 0; }
  }, [itens, computeItemTotal]);

  // Percentuais configuráveis para referência de comissão (default 3 e 5)
  const [percRefInput, setPercRefInput] = React.useState("3,5");
  const percentuaisRefParsed = React.useMemo(() => {
    return percRefInput
      .split(/[,;\s]+/)
      .map((p) => Number(p.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
      .slice(0, 4);
  }, [percRefInput]);

  useAutoLoadItemCosts({ tipo, itens, onUpdateItem });

  const freteShares = React.useMemo(() => {
    if (tipo !== 'COMPRA') return itens.map(() => 0);
    return computeFreteShares(itens, freteTotal);
  }, [tipo, freteTotal, itens]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Itens</h3>
      </div>
      <QuickAddItemRow
        tipo={tipo}
        onAppend={onAddItem}
        itens={itens}
        fetchProdutos={fetchProdutos}
      />

      {editingOrder &&
        originalItens.length > 0 &&
        (() => {
          const changes = getItemChanges();
          return (
            changes.removed.length > 0 && (
              <div className="mb-4 p-3 border border-red-500 bg-red-50 dark:bg-red-900/20 rounded-md">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Itens removidos ({changes.removed.length}):
                </h4>
                {changes.removed.map((removedItem, idx) => (
                  <div
                    key={idx}
                    className="text-sm text-red-700 dark:text-red-300"
                  >
                    •{" "}
                    {removedItem.produto_label ||
                      `Produto ID: ${removedItem.produto_id}`}{" "}
                    - Qtd: {removedItem.quantidade}- Preço:{" "}
                    {formatBRL(Number(removedItem.preco_unitario || 0))}
                  </div>
                ))}
              </div>
            )
          );
        })()}

      <div className="border rounded-md overflow-x-auto mt-4">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-secondary)] text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
            <tr>
              <th className="text-left font-medium px-2 py-2">Produto</th>
              <th className="text-right font-medium px-2 py-2">Qtd</th>
              <th className="text-right font-medium px-2 py-2">Valor Unit.</th>
              <th className="text-right font-medium px-2 py-2">Desc. Unit.</th>
              <th className="text-right font-medium px-2 py-2">Total</th>
              {tipo === "VENDA" && (
                <th className="text-right font-medium px-2 py-2">Lucro</th>
              )}
              {tipo === "COMPRA" && Number(freteTotal || 0) > 0 && (
                <th className="text-right font-medium px-2 py-2">
                  Frete Rateio
                </th>
              )}
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {itens.map((it, idx) => (
              <PedidoItemRow
                key={idx}
                it={it}
                idx={idx}
                tipo={tipo}
                computeItemTotal={computeItemTotal || defaultComputeItemTotal}
                getItemDiffClass={getItemDiffClass}
                getItemDiffIcon={getItemDiffIcon}
                onRemoveItem={onRemoveItem}
                freteShares={freteShares}
                freteTotal={freteTotal}
              />
            ))}
          </tbody>
        </table>
      </div>

      {tipo === "COMPRA" && (
        <div className="flex justify-end mt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Frete
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 dark:text-gray-400">
                R$
              </span>
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

      <div className="flex justify-end mt-3 gap-6 items-start flex-wrap">
        {tipo === 'VENDA' && (
          <PedidoFormResumoLucro
            itens={itens}
            totalItens={totalItens}
            percentuaisRefParsed={percentuaisRefParsed}
            percRefInput={percRefInput}
            setPercRefInput={setPercRefInput}
          />
        )}
        <div className="text-right text-sm font-semibold">
          {(() => {
            const freteVal = tipo === "COMPRA" ? Number(freteTotal || 0) : 0;
            const total =
              Number(totalItens || 0) +
              (Number.isFinite(freteVal) ? freteVal : 0);
            return `Total: ${formatBRL(total)}`;
          })()}
        </div>
      </div>

      {Number.isInteger(productModalIndex) && productModalIndex >= 0 && (
        <SelectionModal
          title="Selecionar Produto"
          fetcher={fetchProdutos}
          extractLabel={(it) => it.label}
          onSelect={async (it) => {
            const targetIndex = productModalIndex;
            onSetProductModalIndex(null);
            if (it && Number.isInteger(targetIndex)) {
              onUpdateItem(targetIndex, {
                produto_id: String(it.id),
                produto_label: it.label,
                produto_saldo: null,
                custo_carregando: tipo === "VENDA" ? true : false,
              });
              if (tipo === "VENDA") {
                // Trazer saldo padrão + custo FIFO + fallback custo médio legacy/último
                Promise.all([
                  fetchSaldoDetalhado(it.id), // saldo, custo_medio, ultimo_custo (legacy)
                  fetchSaldoFifoDetalhado(it.id), // custo_medio_fifo (FIFO real)
                ])
                  .then(([det, fifo]) => {
                    const saldo = det.saldo;
                    const custoFifo =
                      Number.isFinite(fifo.custo_medio_fifo) &&
                        fifo.custo_medio_fifo > 0
                        ? fifo.custo_medio_fifo
                        : null;
                    const baseLegacy = (() => {
                      const cm = Number(det.custo_medio);
                      const ult = Number(det.ultimo_custo);
                      if (Number.isFinite(cm) && cm > 0) return cm;
                      if (Number.isFinite(ult) && ult > 0) return ult;
                      return null;
                    })();
                    onUpdateItem(targetIndex, {
                      produto_saldo: saldo,
                      custo_fifo_unitario: custoFifo,
                      custo_base_unitario: baseLegacy,
                      custo_carregando: false,
                    });
                  })
                  .catch(() => {
                    onUpdateItem(targetIndex, {
                      produto_saldo: null,
                      custo_fifo_unitario: null,
                      custo_base_unitario: null,
                      custo_carregando: false,
                    });
                  });
              } else if (tipo === "COMPRA") {
                // Buscar último preço de compra e preencher se campo estiver vazio
                try {
                  const lastPrice = await fetchLastPurchasePrice(it.id);
                  if (lastPrice != null) {
                    // Preenche somente se preco_unitario atual estiver vazio
                    const current = itens[targetIndex]?.preco_unitario;
                    if (current == null || current === "") {
                      onUpdateItem(targetIndex, {
                        preco_unitario: String(lastPrice.toFixed(2)),
                      });
                    }
                  }
                } catch (_) {
                  /* ignore */
                }
              }
            }
          }}
          onClose={() => onSetProductModalIndex(null)}
          emptyMessage={
            tipo === "COMPRA"
              ? "Este fornecedor não possui produtos relacionados"
              : "Nenhum produto encontrado"
          }
        />
      )}
    </div>
  );
}
