/**
 * Compras agregadas por fornecedor no período (pedidos COMPRA confirmados).
 */
import database from "infra/database.js";

export interface CompraFornecedorRow {
  entity_id: number;
  nome: string;
  total_compras: number;
  pedidos_count: number;
}

export async function fetchComprasPorFornecedor(
  firstDay: string,
  lastDay: string
): Promise<CompraFornecedorRow[]> {
  const result = await database.query({
    text: `SELECT e.id AS entity_id,
                  COALESCE(NULLIF(TRIM(MAX(p.partner_name)), ''), e.name, 'Fornecedor') AS nome,
                  COALESCE(SUM(p.total_liquido + COALESCE(p.frete_total, 0)), 0)::numeric(14,2) AS total_compras,
                  COUNT(DISTINCT p.id)::int AS pedidos_count
           FROM pedidos p
           JOIN entities e ON e.id = p.partner_entity_id
           WHERE p.tipo = 'COMPRA' AND p.status = 'confirmado'
             AND p.data_emissao >= $1 AND p.data_emissao < $2
           GROUP BY e.id, e.name
           ORDER BY total_compras DESC
           LIMIT 50`,
    values: [firstDay, lastDay],
  });

  return ((result.rows || []) as Array<Record<string, unknown>>).map((r) => ({
    entity_id: Number(r.entity_id || 0),
    nome: String(r.nome ?? ""),
    total_compras: Number(r.total_compras || 0),
    pedidos_count: Number(r.pedidos_count || 0),
  }));
}
