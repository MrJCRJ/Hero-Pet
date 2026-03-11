// pages/api/v1/pedidos/fifo_migration_job.ts
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }
  const body = (req.body || {}) as Record<string, unknown>;
  const limit = Math.min(Number(body?.limit) || 20, 100);
  try {
    const candidates = await database.query({
      text: `SELECT p.id
             FROM pedidos p
             WHERE p.tipo='VENDA'
               AND EXISTS (SELECT 1 FROM movimento_estoque m WHERE m.documento=('PEDIDO:'||p.id) AND m.tipo='SAIDA')
               AND EXISTS (SELECT 1 FROM movimento_estoque m LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id WHERE m.documento=('PEDIDO:'||p.id) AND m.tipo='SAIDA' AND mc.id IS NULL)
               AND NOT EXISTS (
                 SELECT 1 FROM pedido_itens i
                 LEFT JOIN LATERAL (
                   SELECT COALESCE(SUM(l.quantidade_disponivel),0) AS disponivel FROM estoque_lote l WHERE l.produto_id = i.produto_id
                 ) ld ON true
                 WHERE i.pedido_id = p.id AND ld.disponivel < i.quantidade
               )
               AND NOT EXISTS (
                 SELECT 1 FROM movimento_estoque m
                 LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
                 WHERE m.documento=('PEDIDO:'||p.id) AND m.tipo='SAIDA' AND mc.id IS NULL
                 GROUP BY m.documento
                 HAVING COUNT(CASE WHEN mc.id IS NULL THEN 1 END) = 0
               )
             ORDER BY p.id ASC
             LIMIT $1`,
      values: [limit],
    });
    const updated: Array<{ id: number; ok: boolean; error?: string }> = [];
    for (const row of candidates.rows as Array<{ id: number }>) {
      try {
        const resp = await fetch(
          `http://localhost:3000/api/v1/pedidos/${row.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ migrar_fifo: true }),
          }
        );
        if (resp.ok) {
          updated.push({ id: row.id, ok: true });
        } else {
          const bodyText = await resp.text();
          updated.push({ id: row.id, ok: false, error: bodyText.slice(0, 200) });
        }
      } catch (e) {
        const err = e as Error;
        updated.push({ id: row.id, ok: false, error: err.message });
      }
    }
    res.status(200).json({ processed: updated.length, results: updated });
  } catch (e) {
    console.error("POST /pedidos/fifo_migration_job error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e))
      res.status(503).json({
        error: "Schema not migrated",
        dependency: "database",
        code: err.code,
        action: "Run migrations",
      });
    else if (isConnectionError(e))
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
      });
    else res.status(500).json({ error: "Internal error" });
  }
}
