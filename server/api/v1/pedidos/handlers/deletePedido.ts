import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export async function deletePedido(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  const client = await database.getClient();
  try {
    const id = Number(req.query?.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    await client.query("BEGIN");
    const head = await client.query({
      text: `SELECT id FROM pedidos WHERE id = $1`,
      values: [id],
    });
    if (!head.rows.length) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Not found" });
      return;
    }
    const docTag = `PEDIDO:${id}`;
    await client.query({
      text: `DELETE FROM movimento_estoque WHERE documento = $1`,
      values: [docTag],
    });
    await client.query({
      text: `DELETE FROM pedido_itens WHERE pedido_id = $1`,
      values: [id],
    });
    await client.query({
      text: `DELETE FROM pedidos WHERE id = $1`,
      values: [id],
    });
    await client.query("COMMIT");
    res.status(200).json({ ok: true });
  } catch (e) {
    await database.safeRollback(client);
    console.error("DELETE /pedidos/:id error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated",
        dependency: "database",
        code: err.code,
        action: "Run migrations",
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
    res.status(400).json({ error: (e as Error).message || "Invalid payload" });
  } finally {
    try {
      client.release();
    } catch {
      /* noop */
    }
  }
}
