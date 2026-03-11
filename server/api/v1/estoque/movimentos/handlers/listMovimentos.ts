import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export async function listMovimentos(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  try {
    const q = req.query || {};
    const produto_id = q.produto_id;
    const limit = q.limit;
    const offset = q.offset;
    const tipo = q.tipo;
    const from = q.from;
    const to = q.to;
    const meta = q.meta;

    const produtoId = produto_id != null ? Number(produto_id) : NaN;
    if (produto_id != null && !Number.isFinite(produtoId)) {
      res.status(400).json({ error: "produto_id inválido" });
      return;
    }
    let effLimit = Number(limit ?? 50);
    if (!Number.isFinite(effLimit) || effLimit <= 0) effLimit = 50;
    if (effLimit > 200) effLimit = 200;
    let effOffset = Number(offset ?? 0);
    if (!Number.isFinite(effOffset) || effOffset < 0) effOffset = 0;

    const clauses: string[] = [];
    const values: unknown[] = [];
    if (Number.isFinite(produtoId)) {
      clauses.push("produto_id = $1");
      values.push(produtoId);
    }
    if (tipo) {
      if (!["ENTRADA", "SAIDA", "AJUSTE"].includes(tipo as string)) {
        res.status(400).json({ error: "tipo inválido" });
        return;
      }
      values.push(tipo);
      clauses.push(`tipo = $${values.length}`);
    }
    if (from) {
      values.push(from);
      clauses.push(`data_movimento >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      clauses.push(`data_movimento <= $${values.length}`);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const listQ = {
      text: `SELECT id, produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, data_movimento
             FROM movimento_estoque
             ${where}
             ORDER BY data_movimento DESC, id DESC
             LIMIT ${effLimit} OFFSET ${effOffset}`,
      values,
    };
    const r = await database.query(listQ);

    if (String(meta) === "1") {
      const countQ = {
        text: `SELECT COUNT(*)::int AS total FROM movimento_estoque ${where}`,
        values,
      };
      const c = await database.query(countQ);
      res.status(200).json({
        data: r.rows,
        meta: { total: (c.rows[0] as Record<string, unknown>).total },
      });
      return;
    }

    res.status(200).json(r.rows);
  } catch (e) {
    console.error("GET /estoque/movimentos error", e);
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
