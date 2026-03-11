// pages/api/v1/pedidos/[id]/promissorias/[seq].ts
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method === "POST") {
    const action =
      (req.query?.action as string) ||
      ((req.body as Record<string, unknown>)?.action as string);
    if (action === "pay") return markPaid(req, res);
    res.status(400).json({ error: "Ação inválida. Use action=pay" });
    return;
  }
  if (req.method === "PUT") return updateDueDate(req, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function markPaid(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  const client = await database.getClient();
  try {
    const id = Number(req.query?.id);
    const seq = Number(req.query?.seq);
    if (!Number.isFinite(id) || !Number.isFinite(seq)) {
      res.status(400).json({ error: "invalid id/seq" });
      return;
    }
    const paidDateRaw =
      (req.body as Record<string, unknown>)?.paid_date ||
      req.query?.paid_date ||
      null;
    if (
      paidDateRaw != null &&
      !/^\d{4}-\d{2}-\d{2}$/.test(String(paidDateRaw))
    ) {
      res.status(400).json({ error: "paid_date inválido (YYYY-MM-DD)" });
      return;
    }
    await client.query("BEGIN");
    const row = await client.query({
      text: `SELECT * FROM pedido_promissorias WHERE pedido_id = $1 AND seq = $2`,
      values: [id, seq],
    });
    if (!row.rows.length) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Duplicata não encontrada" });
      return;
    }
    if ((row.rows[0] as Record<string, unknown>).paid_at) {
      await client.query("ROLLBACK");
      res.status(200).json({ ok: true, alreadyPaid: true });
      return;
    }
    if (paidDateRaw) {
      await client.query({
        text: `UPDATE pedido_promissorias SET paid_at = ($1::date + time '00:00')::timestamptz, updated_at = NOW() WHERE pedido_id = $2 AND seq = $3`,
        values: [paidDateRaw, id, seq],
      });
    } else {
      await client.query({
        text: `UPDATE pedido_promissorias SET paid_at = NOW(), updated_at = NOW() WHERE pedido_id = $1 AND seq = $2`,
        values: [id, seq],
      });
    }
    await client.query("COMMIT");
    res.status(200).json({ ok: true });
  } catch (e) {
    await database.safeRollback(client);
    console.error(
      "POST /pedidos/:id/promissorias/:seq?action=pay error",
      e
    );
    const err = e as { code?: string; message?: string };
    if (isRelationMissing(e))
      res.status(503).json({
        error: "Schema not migrated",
        dependency: "database",
        code: err.code,
        action: "Run migrations",
      });
    else if (isConnectionError(e))
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
      });
    else res.status(400).json({ error: err.message || "Invalid payload" });
  } finally {
    try {
      client.release();
    } catch {
      /* noop */
    }
  }
}

async function updateDueDate(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  const client = await database.getClient();
  try {
    const id = Number(req.query?.id);
    const seq = Number(req.query?.seq);
    if (!Number.isFinite(id) || !Number.isFinite(seq)) {
      res.status(400).json({ error: "invalid id/seq" });
      return;
    }
    const dueRaw = (req.body as Record<string, unknown>)?.due_date;
    if (!dueRaw || !/^\d{4}-\d{2}-\d{2}$/.test(String(dueRaw))) {
      res.status(400).json({ error: "due_date inválido (YYYY-MM-DD)" });
      return;
    }
    await client.query("BEGIN");
    const row = await client.query({
      text: `SELECT paid_at FROM pedido_promissorias WHERE pedido_id = $1 AND seq = $2`,
      values: [id, seq],
    });
    if (!row.rows.length) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Duplicata não encontrada" });
      return;
    }
    if ((row.rows[0] as Record<string, unknown>).paid_at) {
      await client.query("ROLLBACK");
      res
        .status(400)
        .json({ error: "Não é possível alterar data de duplicata já paga" });
      return;
    }
    await client.query({
      text: `UPDATE pedido_promissorias SET due_date = $1, updated_at = NOW() WHERE pedido_id = $2 AND seq = $3`,
      values: [dueRaw, id, seq],
    });
    await client.query("COMMIT");
    res.status(200).json({ ok: true });
  } catch (e) {
    await database.safeRollback(client);
    console.error("PUT /pedidos/:id/promissorias/:seq error", e);
    const err = e as { code?: string; message?: string };
    if (isRelationMissing(e))
      res.status(503).json({
        error: "Schema not migrated",
        dependency: "database",
        code: err.code,
        action: "Run migrations",
      });
    else if (isConnectionError(e))
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
      });
    else res.status(400).json({ error: err.message || "Invalid payload" });
  } finally {
    try {
      client.release();
    } catch {
      /* noop */
    }
  }
}
