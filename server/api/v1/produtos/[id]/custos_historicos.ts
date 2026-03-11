// pages/api/v1/produtos/[id]/custos_historicos.ts
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }
  const client = await database.getClient();
  try {
    const id = Number(req.query?.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "invalid id" });
      return;
    }

    const prod = await client.query({
      text: `SELECT id FROM produtos WHERE id = $1`,
      values: [id],
    });
    if (!prod.rows.length) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    const monthsParam =
      req.query?.months != null ? Number(req.query.months) : 13;
    let months = 13;
    if (Number.isFinite(monthsParam) && monthsParam > 0) {
      months = Math.min(24, Math.trunc(monthsParam));
    }

    const q = await client.query({
      text: `SELECT to_char(date_trunc('month', data_movimento), 'YYYY-MM') AS month,
                    SUM(custo_total_rec) AS total_cost,
                    SUM(quantidade) AS total_qty,
                    CASE WHEN SUM(quantidade) <> 0 THEN SUM(custo_total_rec)/SUM(quantidade) ELSE NULL END AS avg_cost
             FROM movimento_estoque
             WHERE produto_id = $1
               AND tipo = 'SAIDA'
               AND custo_total_rec IS NOT NULL
             GROUP BY 1
             ORDER BY 1 DESC
             LIMIT $2`,
      values: [id, months],
    });

    const dataDesc = q.rows as Array<Record<string, unknown>>;
    const data = dataDesc.reverse().map((r) => ({
      month: r.month,
      avg_cost:
        r.avg_cost != null ? Number(Number(r.avg_cost).toFixed(6)) : null,
      total_qty: r.total_qty != null ? Number(r.total_qty) : 0,
      total_cost:
        r.total_cost != null ? Number(Number(r.total_cost).toFixed(6)) : 0,
    }));

    res.status(200).json({
      data,
      meta: {
        months_requested: months,
        months_returned: data.length,
      },
    });
  } catch (e) {
    console.error("GET /produtos/:id/custos_historicos error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (movimento_estoque/produtos missing)",
        dependency: "database",
        code: err.code,
        action: "Run migrations",
      });
      return;
    }
    if (isConnectionError(e)) {
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
      });
      return;
    }
    res.status(500).json({ error: "Internal error" });
  } finally {
    try {
      client.release();
    } catch {
      /* noop */
    }
  }
}
