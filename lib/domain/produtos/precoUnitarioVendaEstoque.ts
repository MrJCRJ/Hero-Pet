import { extractPesoKgFromNome } from "./extractPesoKgFromNome";

export type PrecoVendaEstoqueInput = {
  nome: string;
  venda_granel?: boolean;
  preco_kg_granel?: number | null;
  preco_tabela?: number | null;
  custo_medio?: number | null;
};

/**
 * Preço de venda por unidade de estoque (saco/embalagem) para cálculo de valor potencial.
 * Granel: kg extraído do nome × R$/kg cadastrado.
 * Caso contrário: preço de tabela, ou custo médio de entrada × 1,2.
 * `null` quando não há base para estimar (comportamento anterior: exibir "-").
 */
export function precoUnitarioVendaEstoque(row: PrecoVendaEstoqueInput): number | null {
  const pesoKg = extractPesoKgFromNome(row.nome) ?? 0;
  const vg = row.venda_granel === true;
  const pkg = Number(row.preco_kg_granel ?? 0);
  if (vg && pkg > 0 && pesoKg > 0) {
    return Number((pkg * pesoKg).toFixed(2));
  }
  const pv = row.preco_tabela;
  const cm = row.custo_medio;
  if (pv != null && Number.isFinite(pv) && pv >= 0) return Number(pv);
  if (cm != null && Number.isFinite(cm) && cm > 0) return Number((cm * 1.2).toFixed(2));
  return null;
}
