// pages/api/v1/pedidos/[id]/promissorias/index.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method === 'GET') return list(req, res);
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function list(req, res) {
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    // Ensure pedido exists
    const ped = await database.query({ text: `SELECT id FROM pedidos WHERE id = $1`, values: [id] });
    if (!ped.rows.length) return res.status(404).json({ error: 'Pedido não encontrado' });

    const rows = await database.query({
      text: `SELECT id, pedido_id, seq,
                    to_char(due_date, 'YYYY-MM-DD') AS due_date,
                    amount, paid_at, pix_txid, pix_brcode,
                    CASE 
                      WHEN paid_at IS NOT NULL THEN 'PAGO'
                      WHEN due_date < CURRENT_DATE THEN 'ATRASADO'
                      ELSE 'PENDENTE'
                    END AS status
             FROM pedido_promissorias WHERE pedido_id = $1 ORDER BY seq`,
      values: [id],
    });
    return res.status(200).json(rows.rows);
  } catch (e) {
    console.error('GET /pedidos/:id/promissorias error', e);
    if (isRelationMissing(e)) return res.status(503).json({ error: 'Schema not migrated (pedido_promissorias missing)', dependency: 'database', code: e.code, action: 'Run migrations' });
    if (isConnectionError(e)) return res.status(503).json({ error: 'Database unreachable', dependency: 'database', code: e.code });
    return res.status(500).json({ error: 'Internal error' });
  }
}
