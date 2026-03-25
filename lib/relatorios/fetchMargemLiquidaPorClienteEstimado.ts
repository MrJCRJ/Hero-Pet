import database from "infra/database.js";

export interface MargemLiquidaClienteEstimadoRow {
  entity_id: number;
  nome: string;
  vendas_liquidas: number;
  cogs: number;
  frete_custo: number;
  comissao_estimativa: number;
  lucro_liquido_estimado: number;
  margem_liquida_pct: number | null;
}

export interface MargemLiquidaPorClienteEstimado {
  totais: {
    vendas_liquidas: number;
    cogs: number;
    frete_custo: number;
    comissao_estimativa: number;
    lucro_liquido_estimado: number;
  };
  top_clientes: MargemLiquidaClienteEstimadoRow[];
}

export async function fetchMargemLiquidaPorClienteEstimado(
  firstDay: string,
  lastDay: string,
  comissaoRate: number,
  topN = 10
): Promise<MargemLiquidaPorClienteEstimado> {
  const [topR, totalR] = await Promise.all([
    database.query({
      text: `WITH vendas_por_entity AS (
               SELECT p.partner_entity_id AS entity_id,
                     COALESCE(NULLIF(TRIM(MAX(p.partner_name)), ''), MAX(e.name), 'Cliente sem nome') AS nome,
                      COALESCE(SUM(p.total_liquido),0)::numeric(14,2) AS vendas_total,
                      COALESCE(SUM(COALESCE(p.frete_total,0)),0)::numeric(14,2) AS frete_custo
                 FROM pedidos p
                 LEFT JOIN entities e ON e.id = p.partner_entity_id
                WHERE p.tipo='VENDA'
                  AND p.status='confirmado'
                  AND p.data_emissao >= $1 AND p.data_emissao < $2
                  AND p.partner_entity_id IS NOT NULL
                GROUP BY p.partner_entity_id
             ),
             cogs_por_entity AS (
               SELECT p.partner_entity_id AS entity_id,
                      COALESCE(SUM(pi.custo_total_item),0)::numeric(14,2) AS cogs
                 FROM pedido_itens pi
                 JOIN pedidos p ON p.id = pi.pedido_id
                WHERE p.tipo='VENDA'
                  AND p.status='confirmado'
                  AND p.data_emissao >= $1 AND p.data_emissao < $2
                GROUP BY p.partner_entity_id
             )
             SELECT v.entity_id,
                    v.nome,
                    v.vendas_total AS vendas_liquidas,
                    COALESCE(c.cogs,0)::numeric(14,2) AS cogs,
                    v.frete_custo AS frete_custo,
                    (v.vendas_total * $3)::numeric(14,2) AS comissao_estimativa,
                    (v.vendas_total - COALESCE(c.cogs,0) - v.frete_custo - (v.vendas_total * $3))::numeric(14,2) AS lucro_liquido_estimado,
                    CASE
                      WHEN v.vendas_total > 0
                      THEN ((v.vendas_total - COALESCE(c.cogs,0) - v.frete_custo - (v.vendas_total * $3)) / v.vendas_total) * 100
                      ELSE NULL
                    END AS margem_liquida_pct
               FROM vendas_por_entity v
               LEFT JOIN cogs_por_entity c USING (entity_id)
               WHERE v.vendas_total > 0
               ORDER BY lucro_liquido_estimado DESC
               LIMIT $4`,
      values: [firstDay, lastDay, comissaoRate, topN],
    }),
    database.query({
      text: `WITH vendas_por_entity AS (
               SELECT p.partner_entity_id AS entity_id,
                      COALESCE(SUM(p.total_liquido),0)::numeric(14,2) AS vendas_total,
                      COALESCE(SUM(COALESCE(p.frete_total,0)),0)::numeric(14,2) AS frete_custo
                 FROM pedidos p
                WHERE p.tipo='VENDA'
                  AND p.status='confirmado'
                  AND p.data_emissao >= $1 AND p.data_emissao < $2
                  AND p.partner_entity_id IS NOT NULL
                GROUP BY p.partner_entity_id
             ),
             cogs_por_entity AS (
               SELECT p.partner_entity_id AS entity_id,
                      COALESCE(SUM(pi.custo_total_item),0)::numeric(14,2) AS cogs
                 FROM pedido_itens pi
                 JOIN pedidos p ON p.id = pi.pedido_id
                WHERE p.tipo='VENDA'
                  AND p.status='confirmado'
                  AND p.data_emissao >= $1 AND p.data_emissao < $2
                GROUP BY p.partner_entity_id
             )
             SELECT
               COALESCE(SUM(v.vendas_total),0)::numeric(14,2) AS vendas_liquidas,
               COALESCE(SUM(COALESCE(c.cogs,0)),0)::numeric(14,2) AS cogs,
               COALESCE(SUM(v.frete_custo),0)::numeric(14,2) AS frete_custo,
               (COALESCE(SUM(v.vendas_total),0) * $3)::numeric(14,2) AS comissao_estimativa,
               (COALESCE(SUM(v.vendas_total),0) - COALESCE(SUM(COALESCE(c.cogs,0)),0) - COALESCE(SUM(v.frete_custo),0) - (COALESCE(SUM(v.vendas_total),0) * $3))::numeric(14,2) AS lucro_liquido_estimado,
               CASE
                 WHEN COALESCE(SUM(v.vendas_total),0) > 0
                 THEN ((COALESCE(SUM(v.vendas_total),0) - COALESCE(SUM(COALESCE(c.cogs,0)),0) - COALESCE(SUM(v.frete_custo),0) - (COALESCE(SUM(v.vendas_total),0) * $3)) / COALESCE(SUM(v.vendas_total),0)) * 100
                 ELSE NULL
               END AS margem_liquida_pct
             FROM vendas_por_entity v
             LEFT JOIN cogs_por_entity c USING (entity_id)`,
      values: [firstDay, lastDay, comissaoRate],
    }),
  ]);

  const topRows = (topR.rows || []) as Array<Record<string, unknown>>;
  const top_clientes: MargemLiquidaClienteEstimadoRow[] = topRows.map((r) => ({
    entity_id: Number(r.entity_id || 0),
    nome: String(r.nome ?? ""),
    vendas_liquidas: Number(r.vendas_liquidas || 0),
    cogs: Number(r.cogs || 0),
    frete_custo: Number(r.frete_custo || 0),
    comissao_estimativa: Number(r.comissao_estimativa || 0),
    lucro_liquido_estimado: Number(r.lucro_liquido_estimado || 0),
    margem_liquida_pct:
      r.margem_liquida_pct == null ? null : Number(r.margem_liquida_pct),
  }));

  const tRow = (totalR.rows?.[0] as Record<string, unknown>) || {};
  return {
    totais: {
      vendas_liquidas: Number(tRow.vendas_liquidas || 0),
      cogs: Number(tRow.cogs || 0),
      frete_custo: Number(tRow.frete_custo || 0),
      comissao_estimativa: Number(tRow.comissao_estimativa || 0),
      lucro_liquido_estimado: Number(tRow.lucro_liquido_estimado || 0),
    },
    top_clientes,
  };
}

