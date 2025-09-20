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

    // fornecedor legacy (único) ainda suportado; novo: suppliers: number[]
    let fornecedorId = b.fornecedor_id || null;
    let suppliers = Array.isArray(b.suppliers) ? b.suppliers : [];
    suppliers = suppliers.filter((v) => Number.isFinite(Number(v))).map((v) => Number(v));
    suppliers = Array.from(new Set(suppliers));

    // validar fornecedor único se fornecido
    if (fornecedorId != null) {
      const r = await database.query({ text: `SELECT id, entity_type FROM entities WHERE id = $1 LIMIT 1`, values: [fornecedorId] });
      if (!r.rows.length) return res.status(400).json({ error: "fornecedor_id inválido" });
      if (r.rows[0].entity_type !== "PJ") return res.status(400).json({ error: "fornecedor deve ser PJ" });
    }
    // validar suppliers múltiplos (todos PJ)
    if (suppliers.length) {
      const r = await database.query({ text: `SELECT id, entity_type FROM entities WHERE id = ANY($1::int[])`, values: [suppliers] });
      const ids = new Set(r.rows.filter((x) => x.entity_type === 'PJ').map((x) => x.id));
      if (ids.size !== suppliers.length) return res.status(400).json({ error: "suppliers inválidos: todos devem existir e ser PJ" });
    }

    // regra solicitada: pelo menos um fornecedor válido
    if (fornecedorId == null && suppliers.length === 0) {
      return res.status(400).json({ error: "Pelo menos um fornecedor é obrigatório (fornecedor_id ou suppliers[])" });
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
    const product = r.rows[0];
    // inserir fornecedores múltiplos
    if (suppliers.length) {
      const rows = suppliers.map((eid, i) => `($1, $${i + 2})`).join(',');
      await database.query({
        text: `INSERT INTO produto_fornecedores (produto_id, entity_id) VALUES ${rows} ON CONFLICT DO NOTHING`,
        values: [product.id, ...suppliers],
      });
    }
    return res.status(201).json(product);
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
    const { q, categoria, codigo_barras, ativo, limit, offset, meta, fields, supplier_id } = req.query;
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
    // filtrar por fornecedor (legacy fornecedor_id OU relação produto_fornecedores)
    const supplierId = supplier_id != null ? parseInt(String(supplier_id), 10) : null;
    if (Number.isFinite(supplierId)) {
      values.push(supplierId);
      const idx = values.length;
      clauses.push(`(fornecedor_id = $${idx} OR id IN (SELECT produto_id FROM produto_fornecedores WHERE entity_id = $${idx}))`);
    }

    const effectiveLimit = Math.min(parseInt(limit || "100", 10) || 100, 500);
    const effectiveOffset = Math.max(parseInt(offset || "0", 10) || 0, 0);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const baseSelect = String(fields) === 'id-nome'
      ? `SELECT id, nome FROM produtos`
      : `SELECT id, nome, descricao, codigo_barras, categoria, fornecedor_id, preco_tabela, markup_percent_default, estoque_minimo, ativo, created_at, updated_at FROM produtos`;
    const listQuery = { text: `${baseSelect} ${where} ORDER BY created_at DESC LIMIT ${effectiveLimit} OFFSET ${effectiveOffset}`, values };
    const result = await database.query(listQuery);
    // opcionalmente expand suppliers (muitos-para-muitos) e supplier_labels para UI (sempre que não for fields=id-nome)
    let rows = result.rows;
    if (String(fields) !== 'id-nome' && rows.length) {
      const produtoIds = rows.map((r) => r.id);
      const prodToSupplierIds = new Map();
      // inicializa com fornecedor_id legado quando existir
      for (const p of rows) {
        const base = [];
        if (p.fornecedor_id != null) base.push(p.fornecedor_id);
        if (base.length) prodToSupplierIds.set(p.id, base);
      }
      if (produtoIds.length) {
        const r2 = await database.query({ text: `SELECT produto_id, entity_id FROM produto_fornecedores WHERE produto_id = ANY($1::int[])`, values: [produtoIds] });
        for (const row of r2.rows) {
          if (!prodToSupplierIds.has(row.produto_id)) prodToSupplierIds.set(row.produto_id, []);
          prodToSupplierIds.get(row.produto_id).push(row.entity_id);
        }
      }
      // Buscar nomes dos fornecedores uma única vez (inclui fornecedor_id quando aplicável)
      const allSupplierIds = Array.from(new Set([
        ...Array.from(prodToSupplierIds.values()).flat(),
      ]));
      const idToName = new Map();
      if (allSupplierIds.length) {
        const r3 = await database.query({ text: `SELECT id, name FROM entities WHERE id = ANY($1::int[])`, values: [allSupplierIds] });
        for (const row of r3.rows) idToName.set(row.id, row.name);
      }
      rows = rows.map((p) => {
        const sids = prodToSupplierIds.get(p.id) || [];
        const labels = sids.map((id) => ({ id, name: idToName.get(id) || `#${id}` }));
        return { ...p, suppliers: sids, supplier_labels: labels };
      });
    }
    if (String(meta) === "1") {
      const countQuery = {
        text: `SELECT COUNT(*)::int AS total FROM produtos ${where}`,
        values,
      };
      const count = await database.query(countQuery);
      return res.status(200).json({ data: rows, meta: { total: count.rows[0].total } });
    }
    return res.status(200).json(rows);
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
