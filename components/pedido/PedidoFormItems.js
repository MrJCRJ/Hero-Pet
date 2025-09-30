import React from "react";
import { Button } from "../ui/Button";
import { SelectionModal } from "../common/SelectionModal";
import {
  formatQty,
  computeComissoes,
  computeMargensPosComissao,
} from "./utils";
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

  // Percentuais configuráveis para referência de comissão (default 3 e 5)
  const [percRefInput, setPercRefInput] = React.useState("3,5");
  const percentuaisRefParsed = React.useMemo(() => {
    return percRefInput
      .split(/[,;\s]+/)
      .map((p) => Number(p.trim()))
      .filter((n) => Number.isFinite(n) && n > 0)
      .slice(0, 4);
  }, [percRefInput]);

  const freteShares = React.useMemo(() => {
    if (tipo !== "COMPRA") return itens.map(() => 0);
    const totalFrete = Number(freteTotal || 0);
    if (!Number.isFinite(totalFrete) || totalFrete <= 0)
      return itens.map(() => 0);
    const quants = itens.map((it) => {
      const qtd = Number(it?.quantidade);
      return Number.isFinite(qtd) && qtd > 0 ? qtd : 0;
    });
    const sumQtd = quants.reduce(
      (acc, q) => acc + (Number.isFinite(q) ? q : 0),
      0,
    );
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
        onAddItem={onAddItem}
        onUpdateItem={onUpdateItem}
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
                  {it.preco_unitario !== ""
                    ? formatBRL(Number(it.preco_unitario))
                    : "—"}
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
                      // Indicador de loading enquanto custos ainda não chegaram
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
                      if (!Number.isFinite(custoRaw) || custoRaw <= 0)
                        return "—";
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
        {tipo === "VENDA" &&
          (() => {
            // Cálculos de lucro total base
            let totalLucro = 0;
            try {
              totalLucro = itens.reduce((acc, it) => {
                const qtd = Number(it.quantidade || 0);
                const preco =
                  Number(it.preco_unitario || 0) -
                  Number(it.desconto_unitario || 0);
                const custoRaw = Number(
                  it.custo_fifo_unitario != null
                    ? it.custo_fifo_unitario
                    : it.custo_base_unitario,
                );
                if (qtd > 0 && preco > 0 && Number.isFinite(custoRaw)) {
                  return acc + (preco - custoRaw) * qtd;
                }
                return acc;
              }, 0);
            } catch (_) {
              totalLucro = 0;
            }
            // Percentuais dinâmicos de referência (padrão 3% e 5%) calculados sobre total da venda
            const percentuaisRef = percentuaisRefParsed.length
              ? percentuaisRefParsed
              : [3, 5];
            const comissoesRef = computeComissoes(totalItens, percentuaisRef);
            const lucroPos = comissoesRef.map((c) => totalLucro - c);
            const margensPos = computeMargensPosComissao(
              totalLucro,
              totalItens,
              comissoesRef,
            );
            const lucroCls =
              totalLucro > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : totalLucro < 0
                  ? "text-red-600 dark:text-red-400"
                  : "opacity-70";
            return (
              <div className="flex flex-col items-end gap-1 text-xs">
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <span className="font-medium">Total:</span>
                  <span className="font-semibold">
                    {formatBRL(Number(totalItens || 0))}
                  </span>
                  <span className="font-medium">Lucro:</span>
                  <span className={`font-semibold ${lucroCls}`}>
                    {formatBRL(totalLucro)}
                  </span>
                  <label className="flex items-center gap-1 text-[10px] opacity-70">
                    <span>Ref %:</span>
                    <input
                      type="text"
                      value={percRefInput}
                      onChange={(e) => setPercRefInput(e.target.value)}
                      className="px-1 py-0.5 border rounded w-24 bg-[var(--color-bg-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500"
                      title="Digite percentuais separados por vírgula. Ex: 3,5 ou 2,4,6"
                    />
                  </label>
                  {percentuaisRef.map((p, idx) => {
                    const comVal = comissoesRef[idx];
                    const lp = lucroPos[idx];
                    const marg = margensPos[idx];
                    const lucroPosCls =
                      lp > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : lp < 0
                          ? "text-red-600 dark:text-red-400"
                          : "opacity-70";
                    return (
                      <React.Fragment key={p}>
                        <span
                          className="font-medium"
                          title={`Comissão de ${p}% sobre o total da venda`}
                        >
                          Comissão {p}%:
                        </span>
                        <span
                          className={`font-semibold ${comVal > 0 ? "text-amber-600 dark:text-amber-400" : "opacity-70"}`}
                          title={`Valor da comissão de ${p}%`}
                        >
                          {formatBRL(comVal)}
                        </span>
                        <span
                          className="font-medium"
                          title={`Lucro após deduzir ${p}% do total da venda`}
                        >
                          Lucro - {p}%:
                        </span>
                        <span
                          className={`font-semibold ${lucroPosCls}`}
                          title={`Lucro final após deduzir ${p}%`}
                        >
                          {formatBRL(lp)}
                        </span>
                        {marg != null && (
                          <span
                            className="text-[10px] opacity-70"
                            title={`Margem % após comissão ${p}%`}
                          >
                            ({marg}% marg.)
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div className="opacity-60 text-[10px] leading-snug max-w-[560px] text-right">
                  Comissão X% calculada sobre o TOTAL da venda. Edite a lista de
                  percentuais em &quot;Ref %&quot; (máx 4). Lucro - X% = Lucro
                  total - Comissão X%.
                </div>
                <div className={`text-[11px] mt-1 font-medium ${lucroCls}`}>
                  {`Lucro Total: ${formatBRL(totalLucro)}`}
                </div>
              </div>
            );
          })()}
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
