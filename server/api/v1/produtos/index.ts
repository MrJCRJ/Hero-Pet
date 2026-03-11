// pages/api/v1/produtos/index.ts
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import { parseProductBody } from "lib/schemas/product";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method === "POST") return postProduto(req, res);
  if (req.method === "GET") return getProdutos(req, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function postProduto(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  try {
    const parsed = parseProductBody(req.body);
    if (!parsed.success) {
      const msg =
        (parsed.error as { issues?: Array<{ message?: string }> }).issues?.[0]
          ?.message || "Validation failed";
      res.status(400).json({ error: msg });
      return;
    }
    const b = parsed.data;
    const nome = b.nome;
    let fornecedorId = b.fornecedor_id ?? null;
    const suppliers = (b.suppliers || []) as number[];

    if (fornecedorId != null) {
      const r = await database.query({
        text: `SELECT id, entity_type FROM entities WHERE id = $1 LIMIT 1`,
        values: [fornecedorId],
      });
      if (!r.rows.length) {
        res.status(400).json({ error: "fornecedor_id inválido" });
        return;
      }
      const row = r.rows[0] as Record<string, unknown>;
      if (row.entity_type !== "PJ") {
        res.status(400).json({ error: "fornecedor deve ser PJ" });
        return;
      }
    }
    if (suppliers.length) {
      const r = await database.query({
        text: `SELECT id, entity_type FROM entities WHERE id = ANY($1::int[])`,
        values: [suppliers],
      });
      const ids = new Set(
        (r.rows as Array<Record<string, unknown>>)
          .filter((x) => x.entity_type === "PJ")
          .map((x) => x.id)
      );
      if (ids.size !== suppliers.length) {
        res.status(400).json({
          error: "suppliers inválidos: todos devem existir e ser PJ",
        });
        return;
      }
    }

    const codigo_barras = b.codigo_barras || null;
    if (codigo_barras) {
      const dup = await database.query({
        text: `SELECT id FROM produtos WHERE codigo_barras = $1 LIMIT 1`,
        values: [codigo_barras],
      });
      if (dup.rows.length) {
        res.status(409).json({ error: "codigo_barras já cadastrado" });
        return;
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
    const product = r.rows[0] as Record<string, unknown>;
    if (suppliers.length) {
      const rows = suppliers
        .map((eid, i) => `($1, $${i + 2})`)
        .join(",");
      await database.query({
        text: `INSERT INTO produto_fornecedores (produto_id, entity_id) VALUES ${rows} ON CONFLICT DO NOTHING`,
        values: [product.id, ...suppliers],
      });
    }
    res.status(201).json(product);
  } catch (e) {
    console.error("POST /produtos error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (produtos table missing)",
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
    if (err?.code === "23505") {
      res.status(409).json({ error: "codigo_barras já cadastrado" });
      return;
    }
    res.status(500).json({ error: "Internal error" });
  }
}

async function getProdutos(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  try {
    const q = req.query || {};
    const searchQ = q.q;
    const categoria = q.categoria;
    const codigo_barras = q.codigo_barras;
    const ativo = q.ativo;
    const limit = q.limit;
    const offset = q.offset;
    const meta = q.meta;
    const fields = q.fields;
    const supplier_id = q.supplier_id;

    const clauses: string[] = [];
    const values: unknown[] = [];

    if (searchQ) {
      values.push(`%${searchQ}%`);
      clauses.push(`nome ILIKE $${values.length}`);
    }
    const categoriaFilter = (categoria || "").toString().trim();
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
        res.status(400).json({ error: "Invalid ativo filter" });
        return;
      }
      values.push(String(ativo) === "true");
      clauses.push(`ativo = $${values.length}`);
    }
    const supplierId =
      supplier_id != null ? parseInt(String(supplier_id), 10) : null;
    if (Number.isFinite(supplierId)) {
      values.push(supplierId);
      const idx = values.length;
      clauses.push(
        `(fornecedor_id = $${idx} OR id IN (SELECT produto_id FROM produto_fornecedores WHERE entity_id = $${idx}))`
      );
    }

    const effectiveLimit = Math.min(
      parseInt(String(limit || "100"), 10) || 100,
      500
    );
    const effectiveOffset = Math.max(
      parseInt(String(offset || "0"), 10) || 0,
      0
    );
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const baseSelect =
      String(fields) === "id-nome"
        ? `SELECT id, nome FROM produtos`
        : `SELECT id, nome, descricao, codigo_barras, categoria, fornecedor_id, preco_tabela, markup_percent_default, estoque_minimo, ativo, created_at, updated_at FROM produtos`;
    const listQuery = {
      text: `${baseSelect} ${where} ORDER BY created_at DESC LIMIT ${effectiveLimit} OFFSET ${effectiveOffset}`,
      values,
    };
    const result = await database.query(listQuery);
    let rows = result.rows as Record<string, unknown>[];

    if (String(fields) !== "id-nome" && rows.length) {
      const produtoIds = rows.map((r) => r.id);
      const prodToSupplierIds = new Map<number, number[]>();
      for (const p of rows) {
        const base: number[] = [];
        if (p.fornecedor_id != null) base.push(p.fornecedor_id as number);
        if (base.length) prodToSupplierIds.set(p.id as number, base);
      }
      if (produtoIds.length) {
        const r2 = await database.query({
          text: `SELECT produto_id, entity_id FROM produto_fornecedores WHERE produto_id = ANY($1::int[])`,
          values: [produtoIds],
        });
        for (const row of r2.rows as Array<{ produto_id: number; entity_id: number }>) {
          if (!prodToSupplierIds.has(row.produto_id))
            prodToSupplierIds.set(row.produto_id, []);
          prodToSupplierIds.get(row.produto_id)!.push(row.entity_id);
        }
      }
      const allSupplierIds = Array.from(
        new Set([...Array.from(prodToSupplierIds.values()).flat()])
      );
      const idToName = new Map<number, string>();
      if (allSupplierIds.length) {
        const r3 = await database.query({
          text: `SELECT id, name FROM entities WHERE id = ANY($1::int[])`,
          values: [allSupplierIds],
        });
        for (const row of r3.rows as Array<{ id: number; name: string }>) {
          idToName.set(row.id, row.name);
        }
      }
      rows = rows.map((p) => {
        const sids = prodToSupplierIds.get(p.id as number) || [];
        const labels = sids.map((id) => ({
          id,
          name: idToName.get(id) || `#${id}`,
        }));
        return { ...p, suppliers: sids, supplier_labels: labels };
      });
    }
    if (String(meta) === "1") {
      const countQuery = {
        text: `SELECT COUNT(*)::int AS total FROM produtos ${where}`,
        values,
      };
      const count = await database.query(countQuery);
      res.status(200).json({
        data: rows,
        meta: { total: (count.rows[0] as Record<string, unknown>).total },
      });
      return;
    }
    res.status(200).json(rows);
  } catch (e) {
    console.error("GET /produtos error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (produtos table missing)",
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
