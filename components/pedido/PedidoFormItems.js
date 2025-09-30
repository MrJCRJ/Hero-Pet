import React from "react";
import { Button } from "../ui/Button";
import { SelectionModal } from "../common/SelectionModal";
import { formatQty } from "./utils";
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

  // Auto-carrega custos para itens de uma VENDA já existentes (ex: pedido em edição) que ainda não possuem custos.
  React.useEffect(() => {
    if (tipo !== "VENDA") return;
    (itens || []).forEach((it, idx) => {
      if (!it) return;
      const hasProduto = !!it.produto_id;
      const temCustos =
        (it.custo_fifo_unitario != null && it.custo_fifo_unitario > 0) ||
        (it.custo_base_unitario != null && it.custo_base_unitario > 0);
      const jaTentou = it.custo_fetch_tentado;
      if (hasProduto && !temCustos && !jaTentou) {
        // Marca tentativa para evitar loop e mostra spinner
        onUpdateItem(idx, {
          custo_carregando: true,
          custo_fetch_tentado: true,
        });
        Promise.all([
          fetchSaldoDetalhado(it.produto_id),
          fetchSaldoFifoDetalhado(it.produto_id),
        ])
          .then(([det, fifo]) => {
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
            onUpdateItem(idx, {
              custo_fifo_unitario: custoFifo,
              custo_base_unitario: baseLegacy,
              produto_saldo: det.saldo ?? it.produto_saldo ?? null,
              custo_carregando: false,
            });
          })
          .catch(() => {
            onUpdateItem(idx, { custo_carregando: false });
          });
      }
    });
  }, [itens, tipo, onUpdateItem]);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Itens</h3>
      </div>
      <QuickAddItemRow
        tipo={tipo}
        itens={itens}
        onUpdateItem={onUpdateItem}
        onAddItem={onAddItem}
        onAppend={(row) => {
          const baseRow = {
            produto_id: String(row.produto_id || ""),
            produto_label: row.produto_label || "",
            quantidade: String(row.quantidade || ""),
            preco_unitario: String(row.preco_unitario ?? ""),
            desconto_unitario: String(row.desconto_unitario ?? ""),
            produto_saldo: null,
            custo_fifo_unitario: null,
            custo_base_unitario: null,
            custo_carregando: false,
          };
          const emptyIdx = itens.findIndex((r) => !r.produto_id);
          let targetIndex;
          if (emptyIdx >= 0) {
            targetIndex = emptyIdx;
            onUpdateItem(emptyIdx, baseRow);
          } else {
            targetIndex = itens.length;
            onAddItem();
            setTimeout(() => onUpdateItem(targetIndex, baseRow), 0);
          }
          // Se for VENDA, buscar custos assim que adiciona para calcular lucro; evita depender exclusivamente do modal de seleção
          if (tipo === "VENDA" && row.produto_id) {
            // Marca item como carregando custos para exibir indicador na coluna Lucro
            onUpdateItem(targetIndex, { custo_carregando: true });
            Promise.all([
              fetchSaldoDetalhado(row.produto_id),
              fetchSaldoFifoDetalhado(row.produto_id),
            ])
              .then(([det, fifo]) => {
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
                  custo_fifo_unitario: custoFifo,
                  custo_base_unitario: baseLegacy,
                  produto_saldo: det.saldo ?? null,
                  custo_carregando: false,
                });
              })
              .catch(() => {
                onUpdateItem(targetIndex, {
                  custo_fifo_unitario: null,
                  custo_base_unitario: null,
                  custo_carregando: false,
                });
              });
          }
        }}
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
                      `Produto ID: ${removedItem.produto_id}`}
                    - Qtd: {removedItem.quantidade}- Preço:{" "}
                    {formatBRL(Number(removedItem.preco_unitario || 0))}
                  </div>
                ))}
              </div>
            )
          );
        })()}

      <div className="border rounded-md overflow-x-auto">
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
        {tipo === "VENDA" && (() => {
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
              if (
                qtd > 0 &&
                preco > 0 &&
                Number.isFinite(custoRaw) &&
                custoRaw > 0
              ) {
                return acc + (preco - custoRaw) * qtd;
              }
              return acc;
            }, 0);
          } catch (_) {
            totalLucro = 0;
          }
          // Margens fixas solicitadas: 3% e 5% sobre LSM (lucro sem margem)
          const margem3Val = Number((totalLucro * 3) / 100);
          const margem5Val = Number((totalLucro * 5) / 100);
          const lucroComMargem3 = totalLucro - margem3Val;
          const lucroComMargem5 = totalLucro - margem5Val;
          const lucroCls =
            totalLucro > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : totalLucro < 0
                ? "text-red-600 dark:text-red-400"
                : "opacity-70";
          const lucroFinal3Cls =
            lucroComMargem3 > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : lucroComMargem3 < 0
                ? "text-red-600 dark:text-red-400"
                : "opacity-70";
          const lucroFinal5Cls =
            lucroComMargem5 > 0
              ? "text-emerald-600 dark:text-emerald-400"
              : lucroComMargem5 < 0
                ? "text-red-600 dark:text-red-400"
                : "opacity-70";
          return (
            <div className="flex flex-col items-end gap-1 text-xs">
              <div className="flex items-center gap-3 flex-wrap justify-end">
                <span className="font-medium">Total:</span>
                <span className="font-semibold">
                  {formatBRL(Number(totalItens || 0))}
                </span>
                <span className="font-medium">LSM:</span>
                <span className={`font-semibold ${lucroCls}`}>
                  {formatBRL(totalLucro)}
                </span>
                <span className="font-medium" title="Comissão fixa de 3% sobre LSM">Comissão 3%:</span>
                <span
                  className={`font-semibold ${margem3Val > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'opacity-70'
                    }`}
                  title="Valor da comissão de 3%"
                >
                  {formatBRL(margem3Val)}
                </span>
                <span className="font-medium" title="Lucro com comissão 3% deduzida">LCM 3%:</span>
                <span className={`font-semibold ${lucroFinal3Cls}`} title="Lucro final após 3%">
                  {formatBRL(lucroComMargem3)}
                </span>
                <span className="font-medium" title="Comissão fixa de 5% sobre LSM">Comissão 5%:</span>
                <span
                  className={`font-semibold ${margem5Val > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'opacity-70'
                    }`}
                  title="Valor da comissão de 5%"
                >
                  {formatBRL(margem5Val)}
                </span>
                <span className="font-medium" title="Lucro com comissão 5% deduzida">LCM 5%:</span>
                <span className={`font-semibold ${lucroFinal5Cls}`} title="Lucro final após 5%">
                  {formatBRL(lucroComMargem5)}
                </span>
              </div>
              <div className="opacity-60 text-[10px] leading-snug max-w-[560px] text-right">
                LSM = Lucro sem margem · Comissão X% = LSM * X% · LCM X% = LSM - Comissão X% (mostrando versões para 3% e 5%)
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
