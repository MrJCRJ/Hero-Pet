// pages/api/v1/entities/summary.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function summary(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  function computePercentages(map, totalCount) {
    const out = {};
    for (const [k, v] of Object.entries(map || {})) {
      out[k] = totalCount ? Number(((v / totalCount) * 100).toFixed(1)) : 0;
    }
    return out;
  }
  try {
    const byStatus = await database.query({
      text: `SELECT document_status AS status, COUNT(*)::int AS count FROM entities GROUP BY document_status`,
    });
    const byPending = await database.query({
      text: `SELECT document_pending AS pending, COUNT(*)::int AS count FROM entities GROUP BY document_pending`,
    });
    // Agregados de completude endereço
    const byAddressFill = await database.query({
      text: `SELECT
        CASE
          WHEN cep IS NOT NULL AND cep <> '' AND numero IS NOT NULL AND numero <> '' THEN 'completo'
          WHEN ( (cep IS NOT NULL AND cep <> '') OR (numero IS NOT NULL AND numero <> '') ) THEN 'parcial'
          ELSE 'vazio'
        END AS fill,
        COUNT(*)::int AS count
      FROM entities
      GROUP BY 1`,
    });
    // Agregados de completude contato
    const byContactFill = await database.query({
      text: `SELECT
        CASE
          WHEN (telefone ~ '^[0-9]{10,}$') AND (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$') THEN 'completo'
          WHEN ( (telefone IS NOT NULL AND telefone <> '') OR (email IS NOT NULL AND email <> '') ) THEN 'parcial'
          ELSE 'vazio'
        END AS fill,
        COUNT(*)::int AS count
      FROM entities
      GROUP BY 1`,
    });
    const total = await database.query(
      "SELECT COUNT(*)::int AS total FROM entities",
    );
    const totalCount = total.rows[0].total;
    const json = {
      total: total.rows[0].total,
      by_status: byStatus.rows.reduce((acc, r) => {
        acc[r.status] = r.count;
        return acc;
      }, {}),
      by_pending: byPending.rows.reduce((acc, r) => {
        acc[r.pending] = r.count;
        return acc;
      }, {}),
      by_address_fill: byAddressFill.rows.reduce((acc, r) => {
        acc[r.fill] = r.count;
        return acc;
      }, {}),
      by_contact_fill: byContactFill.rows.reduce((acc, r) => {
        acc[r.fill] = r.count;
        return acc;
      }, {}),
    };
    // Percentuais (0-100) arredondados 1 casa
    json.percent_address_fill = computePercentages(json.by_address_fill, totalCount);
    json.percent_contact_fill = computePercentages(json.by_contact_fill, totalCount);
    res.status(200).json(json);
  } catch (e) {
    console.error("GET /entities/summary error", e);
    if (isRelationMissing(e)) {
      return res.status(503).json({
        error: "Schema not migrated (entities table missing)",
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
    res.status(500).json({ error: "Internal error" });
  }
}
