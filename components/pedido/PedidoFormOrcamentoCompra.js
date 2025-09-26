import React from "react";
import { formatBRL } from "../common/format";

// Novo conceito: orçamento simplificado para COMPRA
// Agrupa itens por produto e mostra custo médio ponderado incluindo rateio de frete.
// Rateio: frete distribuído proporcionalmente ao custo bruto (custo_unit * qtd) de cada produto.
// Exibe tabela: Produto, Qtd Total, Custo Médio (com frete) e Custo Total (com frete).
export function PedidoFormOrcamentoCompra({ itens, freteTotal }) {
  // Estado local para preços de venda manuais por produto
  const [precosVenda, setPrecosVenda] = React.useState(() => ({}));
  const [percVendedor, setPercVendedor] = React.useState(() => ({})); // percentuais por produto
  const handleChangePreco = (pid, value) => {
    setPrecosVenda((prev) => ({ ...prev, [pid]: value }));
  };
  const handleChangePercVendedor = (pid, value) => {
    setPercVendedor((prev) => ({ ...prev, [pid]: value }));
  };
  const agregados = React.useMemo(() => {
    const map = new Map();
    for (const it of itens) {
      const pid = Number(it.produto_id);
      if (!Number.isFinite(pid)) continue;
      const qtd = Number(it.quantidade || 0);
      if (!(qtd > 0)) continue;
      // Prioridade de custo:
      // 1) custo_fifo_unitario
      // 2) custo_base_unitario
      // 3) preco_unitario - desconto_unitario (fallback quando ainda não há custos carregados)
      let custoUnit = null;
      if (
        it.custo_fifo_unitario != null &&
        Number(it.custo_fifo_unitario) > 0
      ) {
        custoUnit = Number(it.custo_fifo_unitario);
      } else if (
        it.custo_base_unitario != null &&
        Number(it.custo_base_unitario) > 0
      ) {
        custoUnit = Number(it.custo_base_unitario);
      } else {
        const preco = Number(it.preco_unitario || 0);
        const desc = Number(it.desconto_unitario || 0);
        const fallback = preco - desc;
        if (Number.isFinite(fallback) && fallback > 0) custoUnit = fallback;
      }
      if (!(Number.isFinite(custoUnit) && custoUnit > 0)) continue;
      const prev = map.get(pid) || {
        produto_id: pid,
        label: it.produto_label || `#${pid}`,
        qtd: 0,
        custoBruto: 0,
      };
      prev.qtd += qtd;
      prev.custoBruto += custoUnit * qtd;
      map.set(pid, prev);
    }
    const list = Array.from(map.values());
    const totalCustoBruto = list.reduce((a, b) => a + b.custoBruto, 0);
    const frete = Number(freteTotal || 0);
    return list.map((row) => {
      const fat = totalCustoBruto > 0 ? row.custoBruto / totalCustoBruto : 0;
      const freteAlocado = fat * (Number.isFinite(frete) ? frete : 0);
      const custoTotalProduto = row.custoBruto + freteAlocado;
      const custoMedio = row.qtd > 0 ? custoTotalProduto / row.qtd : 0;
      return {
        ...row,
        freteAlocado,
        custoTotalProduto,
        custoMedio,
      };
    });
  }, [itens, freteTotal]);

  // Lucro: (precoVendaUnit - custoMedio)*qtd. Preço de venda unitário é manual.

  return (
    <div
      className="mt-6 border rounded-md overflow-hidden"
      data-testid="orcamento-compra"
    >
      <div className="px-3 py-2 text-sm font-semibold bg-[var(--color-bg-secondary)]">
        Orçamento (Custo Médio + Frete)
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">Produto</th>
            <th className="p-2 w-24 text-right">Qtd</th>
            <th className="p-2 w-32 text-right">Custo Médio</th>
            <th className="p-2 w-32 text-right">Custo Total</th>
            <th className="p-2 w-32 text-right">Preço Venda</th>
            <th className="p-2 w-28 text-right">Vendedor %</th>
            <th className="p-2 w-32 text-right">Lucro</th>
          </tr>
        </thead>
        <tbody>
          {agregados.map((row) => {
            const pvRaw = Number(precosVenda[row.produto_id]);
            const percVendRaw = (() => {
              const v = percVendedor[row.produto_id];
              if (v === undefined) return 3; // default 3%
              const n = Number(v);
              return Number.isFinite(n) ? n : 3;
            })();
            const lucroBruto =
              Number.isFinite(pvRaw) && pvRaw > 0
                ? (pvRaw - row.custoMedio) * row.qtd
                : null;
            const comissao =
              lucroBruto != null && lucroBruto > 0
                ? pvRaw * (percVendRaw / 100) * row.qtd
                : null; // comissão baseada no preço de venda total
            const lucroLiquido =
              lucroBruto != null ? lucroBruto - (comissao || 0) : null;
            return (
              <tr
                key={row.produto_id}
                className="border-t border-[var(--color-border)]"
              >
                <td className="p-2">{row.label}</td>
                <td
                  className="p-2 text-right"
                  data-testid={`orc-qtd-${row.produto_id}`}
                >
                  {row.qtd}
                </td>
                <td
                  className="p-2 text-right"
                  data-testid={`orc-cm-${row.produto_id}`}
                >
                  {formatBRL(row.custoMedio)}
                </td>
                <td
                  className="p-2 text-right"
                  data-testid={`orc-ct-${row.produto_id}`}
                >
                  {formatBRL(row.custoTotalProduto)}
                </td>
                <td className="p-2 text-right">
                  <div className="relative inline-block w-full">
                    <span className="pointer-events-none absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 dark:text-gray-400">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      className="pl-4 pr-1 py-0.5 w-28 text-right border rounded bg-[var(--color-bg-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                      data-testid={`orc-pv-${row.produto_id}`}
                      aria-label={`Preço de venda produto ${row.produto_id}`}
                      value={precosVenda[row.produto_id] ?? ""}
                      onChange={(e) =>
                        handleChangePreco(row.produto_id, e.target.value)
                      }
                    />
                  </div>
                </td>
                <td className="p-2 text-right">
                  <div className="relative inline-block w-full">
                    <input
                      type="number"
                      step="0.01"
                      className="pl-1 pr-1 py-0.5 w-20 text-right border rounded bg-[var(--color-bg-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                      data-testid={`orc-vend-${row.produto_id}`}
                      aria-label={`Percentual vendedor produto ${row.produto_id}`}
                      value={percVendedor[row.produto_id] ?? "3"}
                      onChange={(e) =>
                        handleChangePercVendedor(row.produto_id, e.target.value)
                      }
                    />
                  </div>
                </td>
                <td
                  className="p-2 text-right"
                  data-testid={`orc-lucro-${row.produto_id}`}
                >
                  {(() => {
                    if (lucroLiquido == null) return "—";
                    return formatBRL(Number(lucroLiquido.toFixed(2)));
                  })()}
                </td>
              </tr>
            );
          })}
          {!agregados.length && (
            <tr>
              <td className="p-4 text-center text-xs opacity-60" colSpan={7}>
                Nenhum item com custo para agrupar.
              </td>
            </tr>
          )}
        </tbody>
        {agregados.length > 0 && (
          <tfoot>
            <tr className="border-t border-[var(--color-border)] font-semibold">
              <td className="p-2" colSpan={6}>
                Lucro Total
              </td>
              <td className="p-2 text-right" data-testid="orc-total-lucro">
                {(() => {
                  let total = 0;
                  for (const row of agregados) {
                    const pvRaw = Number(precosVenda[row.produto_id]);
                    if (!Number.isFinite(pvRaw) || pvRaw <= 0) continue;
                    const percVendRaw = (() => {
                      const v = percVendedor[row.produto_id];
                      if (v === undefined) return 3;
                      const n = Number(v);
                      return Number.isFinite(n) ? n : 3;
                    })();
                    const lucroBruto = (pvRaw - row.custoMedio) * row.qtd;
                    if (!Number.isFinite(lucroBruto)) continue;
                    const comissao = pvRaw * (percVendRaw / 100) * row.qtd;
                    const lucroLiquido = lucroBruto - comissao;
                    total += lucroLiquido;
                  }
                  return formatBRL(Number(total.toFixed(2)));
                })()}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
