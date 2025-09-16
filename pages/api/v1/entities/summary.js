// pages/api/v1/entities/summary.js
import database from "infra/database";
import { isConnectionError } from "lib/errors";

export default async function summary(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  try {
    const byStatus = await database.query({
      text: `SELECT document_status AS status, COUNT(*)::int AS count FROM entities GROUP BY document_status`,
    });
    const byPending = await database.query({
      text: `SELECT document_pending AS pending, COUNT(*)::int AS count FROM entities GROUP BY document_pending`,
    });
    const total = await database.query(
      "SELECT COUNT(*)::int AS total FROM entities",
    );
    res.status(200).json({
      total: total.rows[0].total,
      by_status: byStatus.rows.reduce((acc, r) => {
        acc[r.status] = r.count;
        return acc;
      }, {}),
      by_pending: byPending.rows.reduce((acc, r) => {
        acc[r.pending] = r.count;
        return acc;
      }, {}),
    });
  } catch (e) {
    console.error("GET /entities/summary error", e);
    if (isConnectionError(e)) {
      return res.status(503).json({
        error: 'Database unreachable',
        dependency: 'database',
        code: e.code,
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT,
      });
    }
    res.status(500).json({ error: "Internal error" });
  }
}
