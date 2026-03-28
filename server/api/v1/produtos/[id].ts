// pages/api/v1/produtos/[id].ts
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method === "PUT") return putProduto(req, res);
  if (req.method === "DELETE") return deleteProduto(req, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function putProduto(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  try {
    const id = parseInt(String(req.query?.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const b = (req.body || {}) as Record<string, unknown>;

    let suppliers: number[] | undefined;
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
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (field: string, value: unknown) => {
      values.push(value);
      sets.push(`${field} = $${values.length}`);
    };
    if (b.nome !== undefined) set("nome", (b.nome || "").toString().trim());
    if (b.descricao !== undefined) set("descricao", b.descricao || null);
    if (b.categoria !== undefined) set("categoria", b.categoria || null);
    if (b.fabricante !== undefined) set("fabricante", b.fabricante || null);
    if (b.foto_url !== undefined) set("foto_url", b.foto_url || null);
    if (b.preco_tabela !== undefined)
      set("preco_tabela", b.preco_tabela === null ? null : b.preco_tabela);
    if (b.ativo !== undefined)
      set("ativo", b.ativo === false ? false : true);
    if (b.venda_granel !== undefined)
      set("venda_granel", b.venda_granel === false ? false : true);
    if (b.preco_kg_granel !== undefined)
      set(
        "preco_kg_granel",
        b.preco_kg_granel === null || b.preco_kg_granel === ""
          ? null
          : Number(b.preco_kg_granel)
      );
    if (b.estoque_kg !== undefined && b.estoque_kg !== null && b.estoque_kg !== "")
      set("estoque_kg", Number(b.estoque_kg));
    if (b.custo_medio_kg !== undefined && b.custo_medio_kg !== null && b.custo_medio_kg !== "")
      set("custo_medio_kg", Number(b.custo_medio_kg));

    sets.push(`updated_at = NOW()`);

    if (sets.length === 1) {
      const check = await database.query({
        text: `SELECT id FROM produtos WHERE id = $1`,
        values: [id],
      });
      if (!check.rows.length) {
        res.status(404).json({ error: "Not found" });
        return;
      }
    }

    const query = {
      text: `UPDATE produtos SET ${sets.join(", ")} WHERE id = $${values.length + 1}
             RETURNING id, nome, descricao, categoria, fabricante, foto_url, preco_tabela, ativo,
               venda_granel, preco_kg_granel, estoque_kg, custo_medio_kg, created_at, updated_at`,
      values: [...values, id],
    };
    const r = await database.query(query);
    if (!r.rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const product = r.rows[0] as Record<string, unknown>;

    if (suppliers) {
      await database.query({
        text: `DELETE FROM produto_fornecedores WHERE produto_id = $1`,
        values: [id],
      });
      if (suppliers.length) {
        const rows = suppliers
          .map((eid, i) => `($1, $${i + 2})`)
          .join(",");
        await database.query({
          text: `INSERT INTO produto_fornecedores (produto_id, entity_id) VALUES ${rows} ON CONFLICT DO NOTHING`,
          values: [id, ...suppliers],
        });
      }
    }

    const rpf = await database.query({
      text: `SELECT 1 FROM produto_fornecedores WHERE produto_id = $1 LIMIT 1`,
      values: [id],
    });
    if (!rpf.rows.length) {
      res.status(400).json({
        error: "Pelo menos um fornecedor é obrigatório (suppliers[])",
      });
      return;
    }

    res.status(200).json(product);
  } catch (e) {
    console.error("PUT /produtos/:id error", e);
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

async function deleteProduto(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  try {
    const id = parseInt(String(req.query?.id), 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const hard = String(req.query?.hard) === "true";
    const password =
      (req.query?.password as string) ||
      ((req.body as Record<string, unknown>)?.password as string);
    if (hard) {
      if (password !== "98034183") {
        res.status(403).json({ error: "invalid password" });
        return;
      }
      const client = await database.getClient();
      try {
        await client.query("BEGIN");
        const exists = await client.query({
          text: `SELECT id FROM produtos WHERE id = $1 FOR UPDATE`,
          values: [id],
        });
        if (!exists.rows.length) {
          await client.query("ROLLBACK");
          res.status(404).json({ error: "Not found" });
          return;
        }
        await client.query({
          text: `DELETE FROM movimento_consumo_lote
                 WHERE movimento_id IN (
                   SELECT id FROM movimento_estoque WHERE produto_id = $1
                 )`,
          values: [id],
        });
        await client.query({
          text: `DELETE FROM estoque_lote WHERE produto_id = $1`,
          values: [id],
        });
        await client.query({
          text: `DELETE FROM pedido_itens WHERE produto_id = $1`,
          values: [id],
        });
        await client.query({
          text: `DELETE FROM movimento_estoque WHERE produto_id = $1 OR ref_movimento_id IN (
                   SELECT id FROM movimento_estoque WHERE produto_id = $1
                 )`,
          values: [id],
        });
        await client.query({
          text: `DELETE FROM produto_fornecedores WHERE produto_id = $1`,
          values: [id],
        });
        await client.query({
          text: `DELETE FROM produtos WHERE id = $1`,
          values: [id],
        });
        await client.query("COMMIT");
        res.status(200).json({ id, deleted: true, cascaded: true });
        return;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("Hard delete produto falhou", err);
        res.status(500).json({ error: "hard delete failed" });
        return;
      } finally {
        try {
          client.release();
        } catch {
          /* ignore end */
        }
      }
    } else {
      const q = {
        text: `UPDATE produtos SET ativo = false, updated_at = NOW() WHERE id = $1
               RETURNING id, nome, descricao, categoria, fabricante, foto_url, preco_tabela, ativo, created_at, updated_at`,
        values: [id],
      };
      const r = await database.query(q);
      if (!r.rows.length) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.status(200).json(r.rows[0]);
    }
  } catch (e) {
    console.error("DELETE /produtos/:id error", e);
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
