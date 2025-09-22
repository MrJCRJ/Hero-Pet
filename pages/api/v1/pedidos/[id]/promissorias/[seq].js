// pages/api/v1/pedidos/[id]/promissorias/[seq].js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const action = req.query.action || req.body?.action;
    if (action === "pix") return createPIX(req, res);
    if (action === "pay") return markPaid(req, res);
    return res
      .status(400)
      .json({ error: "Ação inválida. Use action=pix ou action=pay" });
  }
  if (req.method === "PUT") return updateDueDate(req, res);
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function createPIX(req, res) {
  const client = await database.getClient();
  try {
    const id = Number(req.query.id);
    const seq = Number(req.query.seq);
    if (!Number.isFinite(id) || !Number.isFinite(seq))
      return res.status(400).json({ error: "invalid id/seq" });
    await client.query("BEGIN");
    const row = await client.query({
      text: `SELECT pp.*, p.tipo, p.partner_name FROM pedido_promissorias pp JOIN pedidos p ON p.id = pp.pedido_id WHERE pp.pedido_id = $1 AND pp.seq = $2`,
      values: [id, seq],
    });
    if (!row.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Promissória não encontrada" });
    }
    const prom = row.rows[0];
    if (prom.paid_at) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Promissória já está paga" });
    }

    // Mock de geração de PIX: cria txid e BRCode locais
    const txid = `PED${id}-SEQ${seq}-${Date.now()}`;
    // "copia e cola" simplificado (BRCode)
    const brcode = `00020126580014BR.GOV.BCB.PIX0136CHAVE-EXEMPLO-HEROPET-UUID520400005303986540${formatAmount(prom.amount)}5802BR5920HERO PET LTDA6009SAO PAULO62190515${txid}6304ABCD`;

    await client.query({
      text: `UPDATE pedido_promissorias SET pix_txid = $1, pix_brcode = $2, updated_at = NOW() WHERE pedido_id = $3 AND seq = $4`,
      values: [txid, brcode, id, seq],
    });
    await client.query("COMMIT");
    return res.status(200).json({ txid, brcode });
  } catch (e) {
    await database.safeRollback(client);
    console.error("POST /pedidos/:id/promissorias/:seq?action=pix error", e);
    if (isRelationMissing(e))
      return res
        .status(503)
        .json({
          error: "Schema not migrated",
          dependency: "database",
          code: e.code,
          action: "Run migrations",
        });
    if (isConnectionError(e))
      return res
        .status(503)
        .json({
          error: "Database unreachable",
          dependency: "database",
          code: e.code,
        });
    return res.status(400).json({ error: e.message || "Invalid payload" });
  } finally {
    try {
      await client.end();
    } catch (_) {
      /* noop */
    }
  }
}

async function markPaid(req, res) {
  const client = await database.getClient();
  try {
    const id = Number(req.query.id);
    const seq = Number(req.query.seq);
    if (!Number.isFinite(id) || !Number.isFinite(seq))
      return res.status(400).json({ error: "invalid id/seq" });
    await client.query("BEGIN");
    const row = await client.query({
      text: `SELECT * FROM pedido_promissorias WHERE pedido_id = $1 AND seq = $2`,
      values: [id, seq],
    });
    if (!row.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Promissória não encontrada" });
    }
    if (row.rows[0].paid_at) {
      await client.query("ROLLBACK");
      return res.status(200).json({ ok: true, alreadyPaid: true });
    }
    await client.query({
      text: `UPDATE pedido_promissorias SET paid_at = NOW(), updated_at = NOW() WHERE pedido_id = $1 AND seq = $2`,
      values: [id, seq],
    });
    await client.query("COMMIT");
    return res.status(200).json({ ok: true });
  } catch (e) {
    await database.safeRollback(client);
    console.error("POST /pedidos/:id/promissorias/:seq?action=pay error", e);
    if (isRelationMissing(e))
      return res
        .status(503)
        .json({
          error: "Schema not migrated",
          dependency: "database",
          code: e.code,
          action: "Run migrations",
        });
    if (isConnectionError(e))
      return res
        .status(503)
        .json({
          error: "Database unreachable",
          dependency: "database",
          code: e.code,
        });
    return res.status(400).json({ error: e.message || "Invalid payload" });
  } finally {
    try {
      await client.end();
    } catch (_) {
      /* noop */
    }
  }
}

function formatAmount(n) {
  const v = Number(n || 0);
  return v.toFixed(2).replace(".", "");
}

async function updateDueDate(req, res) {
  const client = await database.getClient();
  try {
    const id = Number(req.query.id);
    const seq = Number(req.query.seq);
    if (!Number.isFinite(id) || !Number.isFinite(seq))
      return res.status(400).json({ error: "invalid id/seq" });
    const dueRaw = req.body?.due_date;
    if (!dueRaw || !/^\d{4}-\d{2}-\d{2}$/.test(String(dueRaw)))
      return res.status(400).json({ error: "due_date inválido (YYYY-MM-DD)" });
    await client.query("BEGIN");
    const row = await client.query({
      text: `SELECT paid_at FROM pedido_promissorias WHERE pedido_id = $1 AND seq = $2`,
      values: [id, seq],
    });
    if (!row.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Promissória não encontrada" });
    }
    if (row.rows[0].paid_at) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ error: "Não é possível alterar data de promissória já paga" });
    }
    await client.query({
      text: `UPDATE pedido_promissorias SET due_date = $1, updated_at = NOW() WHERE pedido_id = $2 AND seq = $3`,
      values: [dueRaw, id, seq],
    });
    await client.query("COMMIT");
    return res.status(200).json({ ok: true });
  } catch (e) {
    await database.safeRollback(client);
    console.error("PUT /pedidos/:id/promissorias/:seq error", e);
    if (isRelationMissing(e))
      return res
        .status(503)
        .json({
          error: "Schema not migrated",
          dependency: "database",
          code: e.code,
          action: "Run migrations",
        });
    if (isConnectionError(e))
      return res
        .status(503)
        .json({
          error: "Database unreachable",
          dependency: "database",
          code: e.code,
        });
    return res.status(400).json({ error: e.message || "Invalid payload" });
  } finally {
    try {
      await client.end();
    } catch (_) {
      /* noop */
    }
  }
}
