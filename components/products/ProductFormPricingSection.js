import React from "react";
import { formatBRL } from "components/common/format";

// Exibe bloco somente leitura com campos calculados/derivados de preço e estoque.
export function ProductFormPricingSection({
  precoTabela,
  suggestedPreco,
  suggestedOrigin,
  markupPercent,
  estoqueMinimo,
  estoqueHint,
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="text-sm">
          <span className="block mb-1">Preço Tabela</span>
          <div
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            title="Exibimos o Preço Tabela cadastrado; se ausente, usamos custo médio/último custo × markup (fallback 30%). Os custos já incluem frete quando existente."
          >
            {precoTabela !== "" ? (
              formatBRL(Number(precoTabela))
            ) : suggestedPreco != null ? (
              <span>
                {formatBRL(Number(suggestedPreco))}
                {suggestedOrigin && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    (
                    {suggestedOrigin === "custo_medio"
                      ? "base: custo médio"
                      : "base: último custo"}
                    )
                  </span>
                )}
              </span>
            ) : (
              "–"
            )}
          </div>
        </div>
        <div className="text-sm">
          <span className="block mb-1">Markup % (default)</span>
          <div
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            title="Markup padrão do produto; se ausente, exibimos 30% como padrão visual."
          >
            {markupPercent !== ""
              ? `${Number(markupPercent).toFixed(2)} %`
              : `30.00 %`}
          </div>
        </div>
        <div className="text-sm">
          <span className="block mb-1">Estoque mínimo</span>
          <div
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
            title="Exibimos o Estoque mínimo cadastrado; se ausente, usamos sugestão por consumo (30 dias)."
          >
            {estoqueMinimo !== ""
              ? Number(estoqueMinimo).toFixed(0)
              : estoqueHint != null
                ? Number(estoqueHint).toFixed(0)
                : "–"}
          </div>
        </div>
      </div>
      <div className="text-xs opacity-70 mt-1">
        Campos calculados automaticamente (com base em custos e consumo quando
        aplicável)
      </div>
    </>
  );
}

export default ProductFormPricingSection;
