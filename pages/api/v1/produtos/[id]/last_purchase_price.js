import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

// GET /api/v1/produtos/:id/last_purchase_price
// Retorna { produto_id, last_price: number|null, pedido_id, data_emissao } do último pedido de COMPRA
export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  const { id } = req.query;
  const prodId = Number(id);
  if (!Number.isFinite(prodId) || prodId <= 0) {
    return res.status(400).json({ error: "Invalid product id" });
  }
  try {
    const q = await database.query({
      text: `SELECT i.preco_unitario, p.id as pedido_id, p.data_emissao
             FROM pedido_itens i
             JOIN pedidos p ON p.id = i.pedido_id
             WHERE i.produto_id = $1
               AND p.tipo = 'COMPRA'
             ORDER BY p.data_emissao DESC, p.id DESC
             LIMIT 1`,
      values: [prodId],
    });
    if (!q.rows.length) {
      return res.status(200).json({ produto_id: prodId, last_price: null });
    }
    const row = q.rows[0];
    return res.status(200).json({
      produto_id: prodId,
      last_price:
        row.preco_unitario != null ? Number(row.preco_unitario) : null,
      pedido_id: row.pedido_id,
      data_emissao: row.data_emissao,
    });
  } catch (e) {
    if (isRelationMissing(e) || isConnectionError(e)) {
      return res.status(503).json({
        error: "Database unavailable",
        dependency: "database",
        code: e.code,
      });
    }
    console.error("GET /produtos/:id/last_purchase_price error", e);
    return res.status(500).json({ error: "Internal error" });
  }
}
