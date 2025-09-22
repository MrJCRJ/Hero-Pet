// pages/api/v1/produtos/[id].js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method === "PUT") return updateProduto(req, res);
  if (req.method === "DELETE") return deleteProduto(req, res);
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function updateProduto(req, res) {
  try {
    const id = parseInt(req.query.id, 10);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "invalid id" });
    const b = req.body || {};

    // opcionalmente validar fornecedor PJ
    let fornecedorId = b.fornecedor_id ?? undefined; // undefined = não alterar, null = limpar
    if (fornecedorId !== undefined && fornecedorId !== null) {
      const r = await database.query({
        text: `SELECT entity_type FROM entities WHERE id = $1 LIMIT 1`,
        values: [fornecedorId],
      });
      if (!r.rows.length)
        return res.status(400).json({ error: "fornecedor_id inválido" });
      if (r.rows[0].entity_type !== "PJ")
        return res.status(400).json({ error: "fornecedor deve ser PJ" });
    }

    // unique parcial codigo_barras (excluindo o próprio id)
    if (b.codigo_barras) {
      const dup = await database.query({
        text: `SELECT id FROM produtos WHERE codigo_barras = $1 AND id <> $2 LIMIT 1`,
        values: [b.codigo_barras, id],
      });
      if (dup.rows.length) {
        return res.status(409).json({ error: "codigo_barras já cadastrado" });
      }
    }

    // suppliers múltiplos (opcional)
    let suppliers = undefined;
    if (Array.isArray(b.suppliers)) {
      suppliers = b.suppliers
        .filter((v) => Number.isFinite(Number(v)))
        .map((v) => Number(v));
      suppliers = Array.from(new Set(suppliers));
      if (suppliers.length) {
        const r = await database.query({
          text: `SELECT id, entity_type FROM entities WHERE id = ANY($1::int[])`,
          values: [suppliers],
        });
        const ids = new Set(
          r.rows.filter((x) => x.entity_type === "PJ").map((x) => x.id),
        );
        if (ids.size !== suppliers.length)
          return res.status(400).json({
            error: "suppliers inválidos: todos devem existir e ser PJ",
          });
      }
    }

    // Montar update dinâmico somente para campos fornecidos
    const sets = [];
    const values = [];
    const set = (field, value) => {
      values.push(value);
      sets.push(`${field} = $${values.length}`);
    };
    if (b.nome !== undefined) set("nome", (b.nome || "").trim());
    if (b.descricao !== undefined) set("descricao", b.descricao || null);
    if (b.codigo_barras !== undefined)
      set("codigo_barras", b.codigo_barras || null);
    if (b.categoria !== undefined) set("categoria", b.categoria || null);
    if (fornecedorId !== undefined) set("fornecedor_id", fornecedorId);
    if (b.preco_tabela !== undefined)
      set("preco_tabela", b.preco_tabela === null ? null : b.preco_tabela);
    if (b.markup_percent_default !== undefined)
      set(
        "markup_percent_default",
        b.markup_percent_default === null ? null : b.markup_percent_default,
      );
    if (b.estoque_minimo !== undefined)
      set(
        "estoque_minimo",
        b.estoque_minimo === null ? null : b.estoque_minimo,
      );
    if (b.ativo !== undefined) set("ativo", b.ativo === false ? false : true);

    // sempre atualiza updated_at
    sets.push(`updated_at = NOW()`);

    if (sets.length === 1) {
      // só updated_at, não há campos para alterar
      const check = await database.query({
        text: `SELECT id FROM produtos WHERE id = $1`,
        values: [id],
      });
      if (!check.rows.length)
        return res.status(404).json({ error: "Not found" });
    }

    const query = {
      text: `UPDATE produtos SET ${sets.join(", ")} WHERE id = $${values.length + 1}
             RETURNING id, nome, descricao, codigo_barras, categoria, fornecedor_id, preco_tabela, markup_percent_default, estoque_minimo, ativo, created_at, updated_at`,
      values: [...values, id],
    };
    const r = await database.query(query);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    const product = r.rows[0];

    // atualizar tabela de junção se fornecida
    if (suppliers) {
      await database.query({
        text: `DELETE FROM produto_fornecedores WHERE produto_id = $1`,
        values: [id],
      });
      if (suppliers.length) {
        const rows = suppliers.map((eid, i) => `($1, $${i + 2})`).join(",");
        await database.query({
          text: `INSERT INTO produto_fornecedores (produto_id, entity_id) VALUES ${rows} ON CONFLICT DO NOTHING`,
          values: [id, ...suppliers],
        });
      }
    }

    // verificar regra de pelo menos um fornecedor
    const check = await database.query({
      text: `SELECT fornecedor_id FROM produtos WHERE id = $1`,
      values: [id],
    });
    const fornecedorAtual = check.rows[0]?.fornecedor_id || null;
    if (fornecedorAtual == null) {
      const rpf = await database.query({
        text: `SELECT 1 FROM produto_fornecedores WHERE produto_id = $1 LIMIT 1`,
        values: [id],
      });
      if (!rpf.rows.length) {
        return res.status(400).json({
          error:
            "Pelo menos um fornecedor é obrigatório (fornecedor_id ou suppliers[])",
        });
      }
    }

    return res.status(200).json(product);
  } catch (e) {
    console.error("PUT /produtos/:id error", e);
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
    if (e && e.code === "23505") {
      return res.status(409).json({ error: "codigo_barras já cadastrado" });
    }
    return res.status(500).json({ error: "Internal error" });
  }
}

async function deleteProduto(req, res) {
  try {
    const id = parseInt(req.query.id, 10);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "invalid id" });
    const q = {
      text: `UPDATE produtos SET ativo = false, updated_at = NOW() WHERE id = $1
             RETURNING id, nome, descricao, codigo_barras, categoria, fornecedor_id, preco_tabela, markup_percent_default, estoque_minimo, ativo, created_at, updated_at`,
      values: [id],
    };
    const r = await database.query(q);
    if (!r.rows.length) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(r.rows[0]);
  } catch (e) {
    console.error("DELETE /produtos/:id error", e);
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
