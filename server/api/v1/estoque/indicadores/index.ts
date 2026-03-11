import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

/** Dias para considerar "sem movimento" */
const DIAS_SEM_MOVIMENTO = 30;

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const [alertasR, valorR, semMovimentoR] = await Promise.all([
      database.query({
        text: `SELECT COUNT(*)::int AS n FROM (
          SELECT p.id FROM produtos p
          LEFT JOIN movimento_estoque m ON m.produto_id = p.id
          WHERE p.ativo = true AND p.estoque_minimo IS NOT NULL
          GROUP BY p.id
          HAVING COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE m.quantidade END), 0) < p.estoque_minimo
        ) sub`,
      }),
      database.query({
        text: `SELECT COALESCE(SUM(
          saldo * COALESCE(custo_medio, 0)
        ), 0)::numeric(14,2) AS total
        FROM (
          SELECT p.id AS produto_id,
          COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.quantidade WHEN m.tipo='SAIDA' THEN -m.quantidade ELSE m.quantidade END), 0)::numeric(14,3) AS saldo,
          (SELECT COALESCE(SUM(valor_total),0)/NULLIF(SUM(quantidade),0) FROM movimento_estoque WHERE produto_id = p.id AND tipo = 'ENTRADA')::numeric(14,2) AS custo_medio
          FROM produtos p
          LEFT JOIN movimento_estoque m ON m.produto_id = p.id
          WHERE p.ativo = true
          GROUP BY p.id
        ) sub`,
      }),
      database.query({
        text: `SELECT COUNT(*)::int AS n FROM produtos p
          WHERE p.ativo = true
          AND NOT EXISTS (
            SELECT 1 FROM movimento_estoque m
            WHERE m.produto_id = p.id
            AND m.data_movimento >= NOW() - INTERVAL '${DIAS_SEM_MOVIMENTO} days'
          )`,
      }),
    ]);

    const alertas = (alertasR.rows[0] as Record<string, unknown>)?.n ?? 0;
    const valorTotal = Number((valorR.rows[0] as Record<string, unknown>)?.total ?? 0);
    const semMovimento = (semMovimentoR.rows[0] as Record<string, unknown>)?.n ?? 0;

    res.status(200).json({
      produtos_em_alerta: alertas,
      valor_total_estoque: valorTotal,
      produtos_sem_movimento: semMovimento,
      dias_sem_movimento: DIAS_SEM_MOVIMENTO,
    });
  } catch (e) {
    console.error("GET /estoque/indicadores error", e);
    if (isRelationMissing(e)) {
      res.status(503).json({ error: "Schema not migrated" });
      return;
    }
    if (isConnectionError(e)) {
      res.status(503).json({ error: "Database unreachable" });
      return;
    }
    res.status(500).json({ error: "Internal error" });
  }
}
