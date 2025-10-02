import React from "react";

// Componente de tabela de comissões simples (apenas front-end por enquanto)
// Cada linha: vendedor (entity PF), percentual sobre total da venda, valor calculado.
export function PedidoFormComissoes({
  comissoes,
  setComissoes,
  computeOrderTotalEstimate,
  lucroBruto,
}) {
  const totalVenda = computeOrderTotalEstimate();

  // Garante linha única fixa Evandro
  React.useEffect(() => {
    setComissoes((prev) => {
      if (prev.length === 1 && prev[0].vendedor_label === "Evandro")
        return prev;
      // Mantém percentual já digitado se existir primeira linha
      const percentual = prev[0]?.percentual || "";
      return [
        {
          id: prev[0]?.id || "evandro-unique",
          vendedor_id: "evandro-fixed",
          vendedor_label: "Evandro",
          percentual,
          valor_fixo: "",
          modo: "PERCENTUAL",
        },
      ];
    });
  }, [setComissoes]);

  function updatePercentual(value) {
    setComissoes((prev) => prev.map((l) => ({ ...l, percentual: value })));
  }

  function calcularLinha(l) {
    const p = Number(l.percentual);
    if (!Number.isFinite(p) || p <= 0) return 0;
    return Number(((totalVenda * p) / 100).toFixed(2));
  }

  const totalComissao = comissoes.reduce((acc, l) => acc + calcularLinha(l), 0);
  const restanteVenda = totalVenda - totalComissao;
  const lucroRestante = lucroBruto - totalComissao;

  return (
    <div className="mt-6 border rounded-md overflow-hidden">
      <div className="px-3 py-2 text-sm font-semibold bg-[var(--color-bg-secondary)] flex items-center justify-between">
        <span>Comissão do Vendedor</span>
      </div>
      <table className="w-full text-sm" data-testid="comissoes-table">
        <thead>
          <tr className="text-left">
            <th className="p-2">Vendedor</th>
            <th className="p-2 w-32">% Venda</th>
            <th className="p-2 w-32">Valor</th>
          </tr>
        </thead>
        <tbody>
          {comissoes.map((l) => {
            const valor = calcularLinha(l);
            return (
              <tr key={l.id} className="border-t border-[var(--color-border)]">
                <td className="p-2">{l.vendedor_label}</td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.percentual}
                    onChange={(e) => updatePercentual(e.target.value)}
                    className="w-full px-2 py-1 border rounded bg-[var(--color-bg-secondary)]"
                    data-testid="comissao-percentual"
                  />
                </td>
                <td className="p-2">
                  <span className="font-medium" data-testid="comissao-valor">
                    {valor.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        {comissoes.length > 0 && (
          <tfoot>
            <tr className="border-t border-[var(--color-border)] text-xs">
              <td className="p-2 font-semibold">Total Comissão</td>
              <td
                className="p-2 font-semibold"
                colSpan={2}
                data-testid="total-comissao"
              >
                {totalComissao.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
            <tr className="text-xs">
              <td className="p-2 font-semibold">Restante Venda</td>
              <td
                className="p-2 font-semibold"
                colSpan={2}
                data-testid="restante-venda"
              >
                {restanteVenda.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
            <tr className="text-xs">
              <td className="p-2 font-semibold">Lucro Restante</td>
              <td
                className="p-2 font-semibold"
                colSpan={2}
                data-testid="lucro-restante"
              >
                {lucroRestante.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
