import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

// GET /api/v1/pedidos/legacy_count
// Conta pedidos de VENDA cujo fifo_aplicado = false pela mesma lógica usada em listagem.
export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });
  try {
    // Conta pedidos VENDA que NÃO são fifo_aplicado.
    // fifo_aplicado (para VENDA) exige: todas SAIDAS têm custo_total_rec válido E cada SAIDA tem pelo menos um pivot em movimento_consumo_lote.
    // Logo, legacy_count = vendas com SAIDA e (alguma SAIDA sem custo válido OU alguma SAIDA sem pivot).
    const q = await database.query({
      text: `SELECT COUNT(*)::int AS count
             FROM pedidos p
             WHERE p.tipo = 'VENDA'
               AND EXISTS (
                 SELECT 1 FROM movimento_estoque m
                  WHERE m.documento = ('PEDIDO:'||p.id) AND m.tipo='SAIDA'
               )
               AND (
                 EXISTS (
                   SELECT 1 FROM movimento_estoque m
                   WHERE m.documento = ('PEDIDO:'||p.id)
                     AND m.tipo='SAIDA'
                     AND (m.custo_total_rec IS NULL OR m.custo_total_rec = 0)
                 )
                 OR EXISTS (
                   SELECT 1 FROM movimento_estoque m
                   LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
                   WHERE m.documento = ('PEDIDO:'||p.id)
                     AND m.tipo='SAIDA'
                     AND mc.id IS NULL
                 )
               )`,
      values: [],
    });
    return res.status(200).json({ legacy_count: q.rows[0].count });
  } catch (e) {
    console.error("GET /pedidos/legacy_count error", e);
    if (isRelationMissing(e))
      return res
        .status(503)
        .json({ error: "Schema not migrated", code: e.code });
    if (isConnectionError(e))
      return res
        .status(503)
        .json({ error: "Database unreachable", code: e.code });
    return res.status(500).json({ error: "Internal error" });
  }
}
