// pages/api/v1/produtos/[id]/custos_historicos.js
// Retorna histórico mensal (até N meses) de custos reconhecidos (FIFO/legacy) em saídas de PEDIDO.
// Agrupa por mês (YYYY-MM) somando quantidade e custo_total_rec e calcula média ponderada.
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ error: `Method "${req.method}" not allowed` });
  }
  const client = await database.getClient();
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "invalid id" });
    }
    // validar existência do produto (404 se não existe)
    const prod = await client.query({
      text: `SELECT id FROM produtos WHERE id = $1`,
      values: [id],
    });
    if (!prod.rows.length) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const monthsParam =
      req.query.months != null ? Number(req.query.months) : 13; // default 13 meses
    let months = 13;
    if (Number.isFinite(monthsParam) && monthsParam > 0) {
      months = Math.min(24, Math.trunc(monthsParam)); // limitar a 24 para evitar respostas enormes
    }

    // Query: agrupa por mês de data_movimento (saídas com custo reconhecido)
    // Busca em ordem DESC (mais recente primeiro), depois reverte para ASC na resposta.
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

    const dataDesc = q.rows || [];
    // Reverter para cronologia crescente (antigo -> recente)
    const data = dataDesc.reverse().map((r) => ({
      month: r.month,
      avg_cost:
        r.avg_cost != null ? Number(Number(r.avg_cost).toFixed(6)) : null,
      total_qty: r.total_qty != null ? Number(r.total_qty) : 0,
      total_cost:
        r.total_cost != null ? Number(Number(r.total_cost).toFixed(6)) : 0,
    }));

    return res.status(200).json({
      data,
      meta: {
        months_requested: months,
        months_returned: data.length,
      },
    });
  } catch (e) {
    console.error("GET /produtos/:id/custos_historicos error", e);
    if (isRelationMissing(e)) {
      return res.status(503).json({
        error: "Schema not migrated (movimento_estoque/produtos missing)",
        dependency: "database",
        code: e.code,
        action: "Run migrations",
      });
    }
    if (isConnectionError(e)) {
      return res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: e.code,
      });
    }
    return res.status(500).json({ error: "Internal error" });
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (_) {
        /* noop */
      }
    }
  }
}
