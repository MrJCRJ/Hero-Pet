// pages/api/v1/produtos/index.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method === "POST") return postProduto(req, res);
  if (req.method === "GET") return getProdutos(req, res);
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function postProduto(req, res) {
  try {
    const b = req.body || {};
    const nome = (b.nome || "").trim();
    if (!nome) return res.status(400).json({ error: "nome is required" });

    // fornecedor opcional; quando informado deve ser PJ
    let fornecedorId = b.fornecedor_id || null;
    if (fornecedorId != null) {
      const q = {
        text: `SELECT id, entity_type FROM entities WHERE id = $1 LIMIT 1`,
        values: [fornecedorId],
      };
      const r = await database.query(q);
      if (!r.rows.length)
        return res.status(400).json({ error: "fornecedor_id inválido" });
      if (r.rows[0].entity_type !== "PJ")
        return res.status(400).json({ error: "fornecedor deve ser PJ" });
    }

    // unique parcial codigo_barras: validar antes para 409 amigável
    const codigo_barras = b.codigo_barras || null;
    if (codigo_barras) {
      const dup = await database.query({
        text: `SELECT id FROM produtos WHERE codigo_barras = $1 LIMIT 1`,
        values: [codigo_barras],
      });
      if (dup.rows.length) {
        return res.status(409).json({ error: "codigo_barras já cadastrado" });
      }
    }

    const nowFields = `NOW(), NOW()`;
    const insert = {
      text: `INSERT INTO produtos (nome, descricao, codigo_barras, categoria, fornecedor_id, preco_tabela, markup_percent_default, estoque_minimo, ativo, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, ${nowFields})
             RETURNING id, nome, descricao, codigo_barras, categoria, fornecedor_id, preco_tabela, markup_percent_default, estoque_minimo, ativo, created_at, updated_at`,
      values: [
        nome,
        b.descricao || null,
        codigo_barras,
        b.categoria || null,
        fornecedorId,
        b.preco_tabela ?? null,
        b.markup_percent_default ?? null,
        b.estoque_minimo ?? null,
        b.ativo === false ? false : true,
      ],
    };
    const r = await database.query(insert);
    return res.status(201).json(r.rows[0]);
  } catch (e) {
    console.error("POST /produtos error", e);
    if (isRelationMissing(e)) {
      return res.status(503).json({
        error: "Schema not migrated (produtos table missing)",
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
    // conflito de unique index pode cair aqui caso corrida entre checagem e insert
    if (e && e.code === "23505") {
      return res.status(409).json({ error: "codigo_barras já cadastrado" });
    }
    return res.status(500).json({ error: "Internal error" });
  }
}

async function getProdutos(req, res) {
  try {
    const { q, categoria, codigo_barras, ativo, limit, offset, meta, fields } = req.query;
    const clauses = [];
    const values = [];

    if (q) {
      values.push(`%${q}%`);
      clauses.push(`nome ILIKE $${values.length}`);
    }
    const categoriaFilter = (categoria || "").trim();
    if (categoriaFilter) {
      values.push(`%${categoriaFilter}%`);
      clauses.push(`categoria ILIKE $${values.length}`);
    }
    if (codigo_barras) {
      values.push(codigo_barras);
      clauses.push(`codigo_barras = $${values.length}`);
    }
    if (ativo !== undefined) {
      if (!["true", "false"].includes(String(ativo))) {
        return res.status(400).json({ error: "Invalid ativo filter" });
      }
      values.push(String(ativo) === "true");
      clauses.push(`ativo = $${values.length}`);
    }

    const effectiveLimit = Math.min(parseInt(limit || "100", 10) || 100, 500);
    const effectiveOffset = Math.max(parseInt(offset || "0", 10) || 0, 0);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const baseSelect = String(fields) === 'id-nome'
      ? `SELECT id, nome FROM produtos`
      : `SELECT id, nome, descricao, codigo_barras, categoria, fornecedor_id, preco_tabela, markup_percent_default, estoque_minimo, ativo, created_at, updated_at FROM produtos`;
    const listQuery = { text: `${baseSelect} ${where} ORDER BY created_at DESC LIMIT ${effectiveLimit} OFFSET ${effectiveOffset}`, values };
    const result = await database.query(listQuery);

    if (String(meta) === "1") {
      const countQuery = {
        text: `SELECT COUNT(*)::int AS total FROM produtos ${where}`,
        values,
      };
      const count = await database.query(countQuery);
      return res.status(200).json({ data: result.rows, meta: { total: count.rows[0].total } });
    }

    return res.status(200).json(result.rows);
  } catch (e) {
    console.error("GET /produtos error", e);
    if (isRelationMissing(e)) {
      return res.status(503).json({
        error: "Schema not migrated (produtos table missing)",
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
