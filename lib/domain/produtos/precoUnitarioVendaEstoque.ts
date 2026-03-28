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

/**
 * Diferença entre vender pelo equivalente a granel (peso do nome × R$/kg) e o preço de tabela do saco fechado.
 * Positivo: o “saco” a preço kg fica mais caro que o preço de tabela; negativo: granel equiv. fica mais barato que a tabela.
 */
export function diferencaEquivGranelMenosSacoFechado(
  row: PrecoVendaEstoqueInput & { peso_kg_nome?: number | null }
): number | null {
  if (row.venda_granel !== true) return null;
  const peso = row.peso_kg_nome ?? extractPesoKgFromNome(row.nome);
  const pkg = Number(row.preco_kg_granel ?? 0);
  const pt = row.preco_tabela;
  if (peso == null || peso <= 0 || pkg <= 0) return null;
  if (pt == null || !Number.isFinite(pt) || pt < 0) return null;
  return Number((peso * pkg - pt).toFixed(2));
}
