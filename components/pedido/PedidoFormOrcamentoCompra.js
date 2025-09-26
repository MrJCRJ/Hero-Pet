import React from 'react';
import { formatBRL } from '../common/format';

// Novo conceito: orçamento simplificado para COMPRA
// Agrupa itens por produto e mostra custo médio ponderado incluindo rateio de frete.
// Rateio: frete distribuído proporcionalmente ao custo bruto (custo_unit * qtd) de cada produto.
// Exibe tabela: Produto, Qtd Total, Custo Médio (com frete) e Custo Total (com frete).
export function PedidoFormOrcamentoCompra({ itens, freteTotal }) {
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
      if (it.custo_fifo_unitario != null && Number(it.custo_fifo_unitario) > 0) {
        custoUnit = Number(it.custo_fifo_unitario);
      } else if (it.custo_base_unitario != null && Number(it.custo_base_unitario) > 0) {
        custoUnit = Number(it.custo_base_unitario);
      } else {
        const preco = Number(it.preco_unitario || 0);
        const desc = Number(it.desconto_unitario || 0);
        const fallback = preco - desc;
        if (Number.isFinite(fallback) && fallback > 0) custoUnit = fallback;
      }
      if (!(Number.isFinite(custoUnit) && custoUnit > 0)) continue;
      const prev = map.get(pid) || { produto_id: pid, label: it.produto_label || `#${pid}`, qtd: 0, custoBruto: 0 };
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

  const totalComFrete = agregados.reduce((acc, r) => acc + r.custoTotalProduto, 0);
  const totalQtd = agregados.reduce((acc, r) => acc + r.qtd, 0);

  return (
    <div className="mt-6 border rounded-md overflow-hidden" data-testid="orcamento-compra">
      <div className="px-3 py-2 text-sm font-semibold bg-[var(--color-bg-secondary)]">Orçamento (Custo Médio + Frete)</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="p-2">Produto</th>
            <th className="p-2 w-24 text-right">Qtd</th>
            <th className="p-2 w-32 text-right">Custo Médio</th>
            <th className="p-2 w-32 text-right">Custo Total</th>
          </tr>
        </thead>
        <tbody>
          {agregados.map((row) => (
            <tr key={row.produto_id} className="border-t border-[var(--color-border)]">
              <td className="p-2">{row.label}</td>
              <td className="p-2 text-right" data-testid={`orc-qtd-${row.produto_id}`}>{row.qtd}</td>
              <td className="p-2 text-right" data-testid={`orc-cm-${row.produto_id}`}>{formatBRL(row.custoMedio)}</td>
              <td className="p-2 text-right" data-testid={`orc-ct-${row.produto_id}`}>{formatBRL(row.custoTotalProduto)}</td>
            </tr>
          ))}
          {!agregados.length && (
            <tr>
              <td className="p-4 text-center text-xs opacity-60" colSpan={4}>Nenhum item com custo para agrupar.</td>
            </tr>
          )}
        </tbody>
        {agregados.length > 0 && (
          <tfoot>
            <tr className="border-t border-[var(--color-border)] font-semibold">
              <td className="p-2">Totais</td>
              <td className="p-2 text-right" data-testid="orc-total-qtd">{totalQtd}</td>
              <td className="p-2 text-right" data-testid="orc-total-cm">
                {formatBRL(totalQtd > 0 ? totalComFrete / totalQtd : 0)}
              </td>
              <td className="p-2 text-right" data-testid="orc-total-ct">{formatBRL(totalComFrete)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
