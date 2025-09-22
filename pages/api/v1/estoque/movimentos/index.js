// pages/api/v1/estoque/movimentos/index.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method === "GET") return listMovimentos(req, res);
  if (req.method !== "POST")
    return res
      .status(405)
      .json({ error: `Method "${req.method}" not allowed` });
  try {
    const b = req.body || {};
    const produtoId = b.produto_id;
    const tipo = b.tipo;
    const quantidade = Number(b.quantidade);
    if (!produtoId)
      return res.status(400).json({ error: "produto_id is required" });
    if (!["ENTRADA", "SAIDA", "AJUSTE"].includes(tipo))
      return res.status(400).json({ error: "tipo inválido" });
    if (!Number.isFinite(quantidade) || quantidade === 0)
      return res.status(400).json({ error: "quantidade inválida" });
    if (tipo === "SAIDA" && quantidade < 0)
      return res
        .status(400)
        .json({ error: "quantidade de saída deve ser positiva" });

    // ENTRADA: valor_unitario requerido (>=0); SAIDA/AJUSTE ignoram custo
    let valor_unitario =
      b.valor_unitario != null ? Number(b.valor_unitario) : null;
    let frete = b.frete != null ? Number(b.frete) : 0;
    let outras = b.outras_despesas != null ? Number(b.outras_despesas) : 0;
    if (tipo === "ENTRADA") {
      if (!Number.isFinite(valor_unitario) || valor_unitario < 0)
        return res.status(400).json({ error: "valor_unitario inválido" });
    } else {
      valor_unitario = null;
      frete = 0;
      outras = 0;
    }

    // calcular valor_total
    let valor_total = null;
    if (tipo === "ENTRADA") {
      valor_total = quantidade * Number(b.valor_unitario || 0) + frete + outras;
    }

    const insert = {
      text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             RETURNING id, produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, data_movimento`,
      values: [
        produtoId,
        tipo,
        quantidade,
        valor_unitario,
        frete,
        outras,
        valor_total,
        b.documento || null,
        b.observacao || null,
      ],
    };
    const r = await database.query(insert);
    return res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error("POST /estoque/movimentos error", e);
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

async function listMovimentos(req, res) {
  try {
    const { produto_id, limit, offset, tipo, from, to, meta } = req.query;
    const produtoId = Number(produto_id);
    if (!Number.isFinite(produtoId)) {
      return res.status(400).json({ error: "produto_id inválido" });
    }
    let effLimit = Number(limit ?? 50);
    if (!Number.isFinite(effLimit) || effLimit <= 0) effLimit = 50;
    if (effLimit > 200) effLimit = 200;
    let effOffset = Number(offset ?? 0);
    if (!Number.isFinite(effOffset) || effOffset < 0) effOffset = 0;

    const clauses = ["produto_id = $1"];
    const values = [produtoId];
    if (tipo) {
      if (!["ENTRADA", "SAIDA", "AJUSTE"].includes(tipo))
        return res.status(400).json({ error: "tipo inválido" });
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

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
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
      return res
        .status(200)
        .json({ data: r.rows, meta: { total: c.rows[0].total } });
    }

    return res.status(200).json(r.rows);
  } catch (e) {
    console.error("GET /estoque/movimentos error", e);
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
