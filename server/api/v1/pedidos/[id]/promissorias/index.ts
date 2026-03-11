// pages/api/v1/pedidos/[id]/promissorias/index.ts
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method === "GET") return list(req, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function list(req: ApiReqLike, res: ApiResLike): Promise<void> {
  try {
    const id = Number(req.query?.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const ped = await database.query({
      text: `SELECT id FROM pedidos WHERE id = $1`,
      values: [id],
    });
    if (!ped.rows.length) {
      res.status(404).json({ error: "Pedido não encontrado" });
      return;
    }

    const rows = await database.query({
      text: `SELECT id, pedido_id, seq,
                    to_char(due_date, 'YYYY-MM-DD') AS due_date,
                      amount, paid_at,
                    CASE 
                      WHEN paid_at IS NOT NULL THEN 'PAGO'
                      WHEN due_date < CURRENT_DATE THEN 'ATRASADO'
                      ELSE 'PENDENTE'
                    END AS status
             FROM pedido_promissorias WHERE pedido_id = $1 ORDER BY seq`,
      values: [id],
    });
    res.status(200).json(rows.rows);
  } catch (e) {
    console.error("GET /pedidos/:id/duplicatas error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e))
      res.status(503).json({
        error: "Schema not migrated (pedido_promissorias missing)",
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
