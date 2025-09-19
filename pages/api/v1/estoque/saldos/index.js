// pages/api/v1/estoque/saldos/index.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ error: `Method "${req.method}" not allowed` });
  try {
    const produtoId = Number(req.query.produto_id);
    if (!Number.isFinite(produtoId)) {
      return res.status(400).json({ error: "produto_id required" });
    }

    // saldo: entradas + ajustes + saidas(negativo)
    const saldoQuery = {
      text: `SELECT 
              COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN quantidade WHEN tipo='SAIDA' THEN -quantidade ELSE quantidade END),0) AS saldo
            FROM movimento_estoque 
            WHERE produto_id = $1`,
      values: [produtoId],
    };
    const saldoRes = await database.query(saldoQuery);

    // custo médio: sum(valor_total entrada) / sum(qtd entrada)
    const custoQuery = {
      text: `SELECT 
              COALESCE(SUM(valor_total),0) AS total_valor,
              COALESCE(SUM(quantidade),0) AS total_qtd
            FROM movimento_estoque 
            WHERE produto_id = $1 AND tipo = 'ENTRADA'`,
      values: [produtoId],
    };
    const custoRes = await database.query(custoQuery);
    const totalValor = Number(custoRes.rows[0].total_valor || 0);
    const totalQtd = Number(custoRes.rows[0].total_qtd || 0);
    const custo_medio = totalQtd > 0 ? (totalValor / totalQtd) : 0;

    // último custo: última entrada (valor_total / quantidade) se existir
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
      const row = lastRes.rows[0];
      ultimo = Number(row.valor_total) / Number(row.quantidade || 1);
    }

    return res.status(200).json({
      produto_id: produtoId,
      saldo: Number(saldoRes.rows[0].saldo).toFixed(3),
      custo_medio: custo_medio.toFixed(2),
      ultimo_custo: ultimo.toFixed(2),
    });
  } catch (e) {
    console.error("GET /estoque/saldos error", e);
    if (isRelationMissing(e)) {
      return res.status(503).json({
        error: "Schema not migrated (movimento_estoque or produtos missing)",
        dependency: "database",
        code: e.code,
        action: "Run migrations endpoint or apply migrations before use",
      });
    }
    if (isConnectionError(e)) {
      return res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: e.code,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
      });
    }
    return res.status(500).json({ error: "Internal error" });
  }
}
