/**
 * Agregados de frete no período do relatório (pedidos VENDA confirmados).
 */
import database from "infra/database.js";

export interface FretePeriodoResult {
  frete_total_periodo: number;
  por_cliente: Array<{ entity_id: number; nome: string; frete_total: number }>;
}

export async function fetchFretePeriodo(
  firstDay: string,
  lastDay: string
): Promise<FretePeriodoResult> {
  const [totalR, porClienteR] = await Promise.all([
    database.query({
      text: `SELECT COALESCE(SUM(COALESCE(p.frete_total, 0)), 0)::numeric(14,2) AS total
             FROM pedidos p
             WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
               AND p.data_emissao >= $1 AND p.data_emissao < $2`,
      values: [firstDay, lastDay],
    }),
    database.query({
      text: `SELECT p.partner_entity_id AS entity_id,
                    COALESCE(NULLIF(TRIM(MAX(p.partner_name)), ''), MAX(e.name), 'Sem nome') AS nome,
                    COALESCE(SUM(COALESCE(p.frete_total, 0)), 0)::numeric(14,2) AS frete_total
             FROM pedidos p
             LEFT JOIN entities e ON e.id = p.partner_entity_id
             WHERE p.tipo = 'VENDA' AND p.status = 'confirmado'
               AND p.data_emissao >= $1 AND p.data_emissao < $2
               AND p.partner_entity_id IS NOT NULL
             GROUP BY p.partner_entity_id
             HAVING COALESCE(SUM(COALESCE(p.frete_total, 0)), 0) > 0
             ORDER BY frete_total DESC
             LIMIT 30`,
      values: [firstDay, lastDay],
    }),
  ]);

  const frete_total_periodo = Number(
    (totalR.rows[0] as Record<string, unknown>)?.total || 0
  );
  const por_cliente = ((porClienteR.rows || []) as Array<Record<string, unknown>>).map(
    (r) => ({
      entity_id: Number(r.entity_id || 0),
      nome: String(r.nome ?? ""),
      frete_total: Number(r.frete_total || 0),
    })
  );

  return { frete_total_periodo, por_cliente };
}
