import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  try {
    const result = await database.query({
      text: `WITH lote AS (
               SELECT
                 produto_id,
                 COALESCE(SUM(quantidade_disponivel), 0) AS estoque_lote_kg,
                 COALESCE(
                   CASE
                     WHEN SUM(quantidade_disponivel) > 0
                       THEN SUM(quantidade_disponivel * custo_unitario) / SUM(quantidade_disponivel)
                     ELSE 0
                   END,
                   0
                 ) AS custo_lote_kg
               FROM estoque_lote
               GROUP BY produto_id
             ),
             legacy AS (
               SELECT
                 produto_id,
                 COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN quantidade WHEN tipo='SAIDA' THEN -quantidade ELSE quantidade END),0) AS estoque_legacy_kg
               FROM movimento_estoque
               GROUP BY produto_id
             )
             SELECT
               p.id AS produto_id,
               p.nome,
               COALESCE(p.estoque_kg, 0) AS estoque_simplificado_kg,
               COALESCE(p.custo_medio_kg, 0) AS custo_simplificado_kg,
               COALESCE(l.estoque_lote_kg, 0) AS estoque_lote_kg,
               COALESCE(l.custo_lote_kg, 0) AS custo_lote_kg,
               COALESCE(g.estoque_legacy_kg, 0) AS estoque_legacy_kg,
               ABS(COALESCE(p.estoque_kg, 0) - COALESCE(l.estoque_lote_kg, 0)) AS diff_kg,
               ABS(COALESCE(p.custo_medio_kg, 0) - COALESCE(l.custo_lote_kg, 0)) AS diff_custo
             FROM produtos p
             LEFT JOIN lote l ON l.produto_id = p.id
             LEFT JOIN legacy g ON g.produto_id = p.id
             ORDER BY diff_kg DESC, p.id ASC`,
      values: [],
    });

    const items = (result.rows as Array<Record<string, unknown>>).map((r) => ({
      produto_id: Number(r.produto_id),
      nome: String(r.nome ?? ""),
      estoque_simplificado_kg: Number(r.estoque_simplificado_kg ?? 0),
      custo_simplificado_kg: Number(r.custo_simplificado_kg ?? 0),
      estoque_lote_kg: Number(r.estoque_lote_kg ?? 0),
      custo_lote_kg: Number(r.custo_lote_kg ?? 0),
      estoque_legacy_kg: Number(r.estoque_legacy_kg ?? 0),
      diff_kg: Number(r.diff_kg ?? 0),
      diff_custo: Number(r.diff_custo ?? 0),
    }));

    const divergentes = items.filter((i) => i.diff_kg > 0.001 || i.diff_custo > 0.01);

    res.status(200).json({
      total_produtos: items.length,
      divergentes: divergentes.length,
      top_divergencias: divergentes.slice(0, 50),
    });
  } catch (e) {
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (produtos|estoque_lote|movimento_estoque missing)",
        dependency: "database",
        code: err.code,
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
    console.error("GET /estoque/reconciliacao error", e);
    res.status(500).json({ error: "Internal error" });
  }
}

