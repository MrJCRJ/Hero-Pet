import type { PoolClient } from "pg";

export function isSimplifiedStockEnabled(): boolean {
  return String(process.env.USE_SIMPLIFIED_STOCK || "").trim() === "1";
}

export function isDualWriteStockEnabled(): boolean {
  return String(process.env.DUAL_WRITE_STOCK || "").trim() === "1";
}

export async function lockProdutoEstoque(
  client: PoolClient,
  produtoId: number
): Promise<{ estoqueKg: number; custoMedioKg: number }> {
  const r = await client.query({
    text: `SELECT id, COALESCE(estoque_kg, 0) AS estoque_kg, COALESCE(custo_medio_kg, 0) AS custo_medio_kg
           FROM produtos
           WHERE id = $1
           FOR UPDATE`,
    values: [produtoId],
  });
  if (!r.rows.length) throw new Error(`produto_id inválido: ${produtoId}`);
  const row = r.rows[0] as Record<string, unknown>;
  return {
    estoqueKg: Number(row.estoque_kg ?? 0),
    custoMedioKg: Number(row.custo_medio_kg ?? 0),
  };
}

export function computeNewAverageCost(input: {
  estoqueAtualKg: number;
  custoMedioAtualKg: number;
  quantidadeEntradaKg: number;
  custoEntradaKg: number;
}): number {
  const { estoqueAtualKg, custoMedioAtualKg, quantidadeEntradaKg, custoEntradaKg } = input;
  if (quantidadeEntradaKg <= 0) return custoMedioAtualKg;
  if (estoqueAtualKg <= 0) return custoEntradaKg;
  const novoEstoque = estoqueAtualKg + quantidadeEntradaKg;
  if (novoEstoque <= 0) return custoEntradaKg;
  return (estoqueAtualKg * custoMedioAtualKg + quantidadeEntradaKg * custoEntradaKg) / novoEstoque;
}

export async function registerSimplifiedMovement(
  client: PoolClient,
  input: {
    produtoId: number;
    tipo: "entrada" | "saida";
    quantidadeKg: number;
    precoUnitarioKg?: number | null;
    observacao?: string | null;
    refPedidoId?: number | null;
  }
): Promise<void> {
  await client.query({
    text: `INSERT INTO movimentacoes_estoque (produto_id, tipo, quantidade_kg, preco_unitario_kg, observacao, ref_pedido_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
    values: [
      input.produtoId,
      input.tipo,
      input.quantidadeKg,
      input.precoUnitarioKg ?? null,
      input.observacao ?? null,
      input.refPedidoId ?? null,
    ],
  });
}

