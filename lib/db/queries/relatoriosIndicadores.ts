import database from "infra/database.js";

function asNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export async function getVendasPeriodo(firstDay: string, lastDay: string): Promise<number> {
  const result = await database.query({
    text: `SELECT COALESCE(SUM(total_liquido),0)::numeric(14,2) AS total
           FROM pedidos WHERE tipo = 'VENDA' AND status = 'confirmado'
           AND data_emissao >= $1 AND data_emissao < $2`,
    values: [firstDay, lastDay],
  });
  return asNumber((result.rows[0] as Record<string, unknown>)?.total);
}

export async function getComprasPeriodo(firstDay: string, lastDay: string): Promise<number> {
  const result = await database.query({
    text: `SELECT COALESCE(SUM(total_liquido + COALESCE(frete_total,0)),0)::numeric(14,2) AS total
           FROM pedidos WHERE tipo = 'COMPRA' AND status = 'confirmado'
           AND data_emissao >= $1 AND data_emissao < $2`,
    values: [firstDay, lastDay],
  });
  return asNumber((result.rows[0] as Record<string, unknown>)?.total);
}

export async function getCogsPeriodo(firstDay: string, lastDay: string): Promise<number> {
  const result = await database.query({
    text: `SELECT COALESCE(SUM(i.custo_total_item),0)::numeric(14,2) AS cogs
           FROM pedido_itens i JOIN pedidos p ON p.id = i.pedido_id
           WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
           AND p.data_emissao >= $1 AND p.data_emissao < $2`,
    values: [firstDay, lastDay],
  });
  return asNumber((result.rows[0] as Record<string, unknown>)?.cogs);
}

export async function getEstoqueAtualCusto(): Promise<number> {
  const result = await database
    .query({
      text: `SELECT COALESCE(SUM(saldo * COALESCE(custo_medio, 0)), 0)::numeric(14,2) AS total
             FROM (
               SELECT p.id,
                 COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE m.quantidade END), 0)::numeric(14,3) AS saldo,
                 (SELECT COALESCE(SUM(valor_total),0)/NULLIF(SUM(quantidade),0) FROM movimento_estoque WHERE produto_id = p.id AND tipo = 'ENTRADA')::numeric(14,2) AS custo_medio
               FROM produtos p
               LEFT JOIN movimento_estoque m ON m.produto_id = p.id
               WHERE p.ativo = true
               GROUP BY p.id
             ) sub`,
    })
    .catch(() => ({ rows: [{ total: 0 }] }));
  return asNumber((result.rows[0] as Record<string, unknown>)?.total);
}

export async function getContasReceberEmAberto(dataCorte: string): Promise<number> {
  const result = await database.query({
    text: `SELECT COALESCE(SUM(pp.amount),0)::numeric(14,2) AS total
           FROM pedido_promissorias pp JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'VENDA'
           WHERE pp.paid_at IS NULL OR pp.paid_at >= $1::date`,
    values: [dataCorte],
  });
  return asNumber((result.rows[0] as Record<string, unknown>)?.total);
}

export async function getContasPagarEmAberto(dataCorte: string): Promise<number> {
  const result = await database.query({
    text: `SELECT (
             COALESCE((SELECT SUM(pp.amount) FROM pedido_promissorias pp
               JOIN pedidos p ON p.id = pp.pedido_id AND p.tipo = 'COMPRA'
               WHERE p.data_emissao < $1::date AND (pp.paid_at IS NULL OR pp.paid_at >= $1::date)), 0) +
             COALESCE((SELECT SUM(valor) FROM despesas
               WHERE status != 'cancelado' AND (data_pagamento IS NULL OR data_pagamento >= $1::date)), 0)
           )::numeric(14,2) AS total`,
    values: [dataCorte],
  });
  return asNumber((result.rows[0] as Record<string, unknown>)?.total);
}
