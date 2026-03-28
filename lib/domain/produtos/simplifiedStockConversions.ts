import { extractPesoKgFromNome } from "./extractPesoKgFromNome";

export type ProdutoGranelMeta = {
  nome: string;
  venda_granel: boolean;
};

/**
 * Movimentos e pedidos (exceto bot) usam quantidade em **unidades** (sacos).
 * `estoque_kg` no cadastro deve refletir **kg** = sacos × peso do saco (nome) quando granel.
 * Se `quantidadeJaEmKg`, não multiplica (ex.: bot vende por kg).
 */
export function quantidadeUnidadesParaKgEstoque(
  quantidade: number,
  meta: ProdutoGranelMeta,
  opts?: { quantidadeJaEmKg?: boolean }
): number {
  if (opts?.quantidadeJaEmKg) return quantidade;
  if (!meta.venda_granel) return quantidade;
  const peso = extractPesoKgFromNome(String(meta.nome ?? ""));
  if (peso == null || peso <= 0) return quantidade;
  return Number((quantidade * peso).toFixed(3));
}

/** Na entrada, valor unitário costuma ser R$/saco → custo médio em kg exige R$/kg. */
export function valorUnitarioUnidadeParaCustoKg(
  valorUnitarioPorUnidade: number,
  meta: ProdutoGranelMeta,
  opts?: { valorJaPorKg?: boolean }
): number {
  if (opts?.valorJaPorKg) return valorUnitarioPorUnidade;
  if (!meta.venda_granel) return valorUnitarioPorUnidade;
  const peso = extractPesoKgFromNome(String(meta.nome ?? ""));
  if (peso == null || peso <= 0) return valorUnitarioPorUnidade;
  return Number((valorUnitarioPorUnidade / peso).toFixed(6));
}
