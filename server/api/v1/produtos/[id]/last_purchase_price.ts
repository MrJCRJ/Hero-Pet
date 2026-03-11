import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return;
  }
  const id = req.query?.id;
  const prodId = Number(id);
  if (!Number.isFinite(prodId) || prodId <= 0) {
    res.status(400).json({ error: "Invalid product id" });
    return;
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
      res.status(200).json({ produto_id: prodId, last_price: null });
      return;
    }
    const row = q.rows[0] as Record<string, unknown>;
    res.status(200).json({
      produto_id: prodId,
      last_price:
        row.preco_unitario != null ? Number(row.preco_unitario) : null,
      pedido_id: row.pedido_id,
      data_emissao: row.data_emissao,
    });
  } catch (e) {
    const err = e as { code?: string };
    if (isRelationMissing(e) || isConnectionError(e)) {
      res.status(503).json({
        error: "Database unavailable",
        dependency: "database",
        code: err.code,
      });
      return;
    }
    console.error("GET /produtos/:id/last_purchase_price error", e);
    res.status(500).json({ error: "Internal error" });
  }
}
