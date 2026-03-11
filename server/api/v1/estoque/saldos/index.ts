// pages/api/v1/estoque/saldos/index.ts
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
  try {
    const produtoId = Number(req.query?.produto_id);
    if (!Number.isFinite(produtoId)) {
      res.status(400).json({ error: "produto_id required" });
      return;
    }

    const saldoQuery = {
      text: `SELECT 
              COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN quantidade WHEN tipo='SAIDA' THEN -quantidade ELSE quantidade END),0) AS saldo
            FROM movimento_estoque 
            WHERE produto_id = $1`,
      values: [produtoId],
    };
    const saldoRes = await database.query(saldoQuery);

    const custoQuery = {
      text: `SELECT 
              COALESCE(SUM(valor_total),0) AS total_valor,
              COALESCE(SUM(quantidade),0) AS total_qtd
            FROM movimento_estoque 
            WHERE produto_id = $1 AND tipo = 'ENTRADA'`,
      values: [produtoId],
    };
    const custoRes = await database.query(custoQuery);
    const totalValor = Number(
      (custoRes.rows[0] as Record<string, unknown>).total_valor || 0
    );
    const totalQtd = Number(
      (custoRes.rows[0] as Record<string, unknown>).total_qtd || 0
    );
    const custo_medio = totalQtd > 0 ? totalValor / totalQtd : 0;

    const lastQuery = {
      text: `SELECT valor_total, quantidade FROM movimento_estoque 
             WHERE produto_id=$1 AND tipo='ENTRADA'
             ORDER BY data_movimento DESC, id DESC
             LIMIT 1`,
      values: [produtoId],
    };
    const lastRes = await database.query(lastQuery);
    let ultimo = 0;
    if (lastRes.rows.length) {
      const row = lastRes.rows[0] as Record<string, unknown>;
      ultimo =
        Number(row.valor_total) / Number(row.quantidade || 1);
    }

    res.status(200).json({
      produto_id: produtoId,
      saldo: Number((saldoRes.rows[0] as Record<string, unknown>).saldo).toFixed(
        3
      ),
      custo_medio: custo_medio.toFixed(2),
      ultimo_custo: ultimo.toFixed(2),
    });
  } catch (e) {
    console.error("GET /estoque/saldos error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (movimento_estoque or produtos missing)",
        dependency: "database",
        code: err.code,
        action: "Run migrations endpoint or apply migrations before use",
      });
      return;
    }
    if (isConnectionError(e)) {
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
      });
      return;
    }
    res.status(500).json({ error: "Internal error" });
  }
}
