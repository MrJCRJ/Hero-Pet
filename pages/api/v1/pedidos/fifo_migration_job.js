// pages/api/v1/pedidos/fifo_migration_job.js
// Executa migração automática: identifica pedidos VENDA legacy elegíveis e aplica reprocessamento FIFO (PUT migrar_fifo=true)
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ error: `Method "${req.method}" not allowed` });
  const limit = Math.min(Number(req.body?.limit) || 20, 100);
  try {
    const candidates = await database.query({
      text: `SELECT p.id
             FROM pedidos p
             WHERE p.tipo='VENDA'
               AND EXISTS (SELECT 1 FROM movimento_estoque m WHERE m.documento=('PEDIDO:'||p.id) AND m.tipo='SAIDA') -- anySaida
               AND EXISTS (SELECT 1 FROM movimento_estoque m LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id WHERE m.documento=('PEDIDO:'||p.id) AND m.tipo='SAIDA' AND mc.id IS NULL) -- anySaidaSemPivot
               AND NOT EXISTS ( -- itemsAllCovered = true
                 SELECT 1 FROM pedido_itens i
                 LEFT JOIN LATERAL (
                   SELECT COALESCE(SUM(l.quantidade_disponivel),0) AS disponivel FROM estoque_lote l WHERE l.produto_id = i.produto_id
                 ) ld ON true
                 WHERE i.pedido_id = p.id AND ld.disponivel < i.quantidade
               )
               AND NOT EXISTS ( -- já não é fifo
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
    const updated = [];
    for (const row of candidates.rows) {
      // Chama internamente o próprio endpoint PUT para reutilizar lógica central.
      // Suporte: usamos fetch relativo (assumindo HOST local). Em execução serverless pode precisar URL absoluta.
      try {
        const resp = await fetch(
          `http://localhost:3000/api/v1/pedidos/${row.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ migrar_fifo: true }),
          },
        );
        if (resp.ok) {
          updated.push({ id: row.id, ok: true });
        } else {
          const body = await resp.text();
          updated.push({ id: row.id, ok: false, error: body.slice(0, 200) });
        }
      } catch (e) {
        updated.push({ id: row.id, ok: false, error: e.message });
      }
    }
    return res
      .status(200)
      .json({ processed: updated.length, results: updated });
  } catch (e) {
    console.error("POST /pedidos/fifo_migration_job error", e);
    if (isRelationMissing(e))
      return res.status(503).json({
        error: "Schema not migrated",
        dependency: "database",
        code: e.code,
        action: "Run migrations",
      });
    if (isConnectionError(e))
      return res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: e.code,
      });
    return res.status(500).json({ error: "Internal error" });
  }
}
