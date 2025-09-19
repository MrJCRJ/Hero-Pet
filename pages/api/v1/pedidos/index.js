// pages/api/v1/pedidos/index.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method === "POST") return postPedido(req, res);
  if (req.method === "GET") return getPedidos(req, res);
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function postPedido(req, res) {
  const client = await database.getClient();
  try {
    const b = req.body || {};
    const tipo = b.tipo;
    if (!["VENDA", "COMPRA"].includes(tipo)) return res.status(400).json({ error: "tipo inválido" });

    // cliente/fornecedor: obrigatório e ativo
    const partnerIdRaw = b.partner_entity_id;
    if (partnerIdRaw == null) return res.status(400).json({ error: "partner_entity_id obrigatório" });
    const partnerId = Number(partnerIdRaw);
    if (!Number.isFinite(partnerId)) return res.status(400).json({ error: "partner_entity_id inválido" });
    const r = await client.query({ text: `SELECT id, ativo FROM entities WHERE id = $1`, values: [partnerId] });
    if (!r.rows.length) return res.status(400).json({ error: "Entidade não encontrada" });
    if (r.rows[0].ativo === false) return res.status(400).json({ error: "Entidade inativa" });

    await client.query("BEGIN");
    const head = await client.query({
      text: `INSERT INTO pedidos (tipo, status, partner_entity_id, partner_document, partner_name, data_emissao, data_entrega, observacao, tem_nota_fiscal, parcelado)
             VALUES ($1,'rascunho',$2,$3,$4, COALESCE($5::timestamptz, NOW()), $6,$7,$8,$9)
             RETURNING *`,
      values: [
        tipo,
        partnerId,
        b.partner_document || null,
        b.partner_name || null,
        b.data_emissao || null,
        b.data_entrega || null,
        b.observacao || null,
        b.tem_nota_fiscal ?? null,
        b.parcelado ?? null,
      ],
    });
    const pedido = head.rows[0];

    const itens = Array.isArray(b.itens) ? b.itens : [];
    let totalBruto = 0;
    let descontoTotal = 0;
    let totalLiquido = 0;
    for (const it of itens) {
      const rProd = await client.query({ text: `SELECT id, preco_tabela FROM produtos WHERE id = $1`, values: [it.produto_id] });
      if (!rProd.rows.length) throw new Error(`produto_id inválido: ${it.produto_id}`);
      const qtd = Number(it.quantidade);
      if (!Number.isFinite(qtd) || qtd <= 0) throw new Error(`quantidade inválida`);
      const preco = it.preco_unitario != null ? Number(it.preco_unitario) : Number(rProd.rows[0].preco_tabela ?? 0);
      const desconto = it.desconto_unitario != null ? Number(it.desconto_unitario) : 0;
      const totalItem = (preco - desconto) * qtd;
      totalBruto += preco * qtd;
      descontoTotal += desconto * qtd;
      totalLiquido += totalItem;
      await client.query({
        text: `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, desconto_unitario, total_item)
               VALUES ($1,$2,$3,$4,$5,$6)`,
        values: [pedido.id, it.produto_id, qtd, preco, desconto, totalItem],
      });
    }
    // Atualiza totais calculados
    await client.query({
      text: `UPDATE pedidos SET total_bruto = $1, desconto_total = $2, total_liquido = $3, updated_at = NOW() WHERE id = $4`,
      values: [totalBruto, descontoTotal, totalLiquido, pedido.id],
    });
    const finalHead = await client.query({ text: `SELECT * FROM pedidos WHERE id = $1`, values: [pedido.id] });

    await client.query("COMMIT");
    return res.status(201).json(finalHead.rows[0]);
  } catch (e) {
    await database.safeRollback(client);
    console.error("POST /pedidos error", e);
    if (isRelationMissing(e)) return res.status(503).json({ error: "Schema not migrated (pedidos|pedido_itens missing)", dependency: "database", code: e.code, action: "Run migrations" });
    if (isConnectionError(e)) return res.status(503).json({ error: "Database unreachable", dependency: "database", code: e.code });
    return res.status(400).json({ error: e.message || "Invalid payload" });
  } finally {
    client.release();
  }
}

async function getPedidos(req, res) {
  try {
    const { status, tipo, q, from, to, limit, offset, meta } = req.query;
    const clauses = [];
    const values = [];
    if (tipo) {
      if (!["VENDA", "COMPRA"].includes(tipo)) return res.status(400).json({ error: "tipo inválido" });
      values.push(tipo);
      clauses.push(`tipo = $${values.length}`);
    }
    if (status) {
      if (!["rascunho", "confirmado", "cancelado"].includes(status)) return res.status(400).json({ error: "status inválido" });
      values.push(status);
      clauses.push(`status = $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      clauses.push(`(partner_name ILIKE $${values.length} OR partner_document ILIKE $${values.length})`);
    }
    if (from) {
      values.push(from);
      clauses.push(`data_emissao >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      clauses.push(`data_emissao <= $${values.length}`);
    }
    const effectiveLimit = Math.min(parseInt(limit || "50", 10) || 50, 200);
    const effectiveOffset = Math.max(parseInt(offset || "0", 10) || 0, 0);
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const listQuery = {
      text: `SELECT id, tipo, status, partner_entity_id, partner_document, partner_name, data_emissao, data_entrega, total_liquido, created_at
             FROM pedidos
             ${where}
             ORDER BY data_emissao DESC, id DESC
             LIMIT ${effectiveLimit} OFFSET ${effectiveOffset}`,
      values,
    };
    const result = await database.query(listQuery);
    if (String(meta) === "1") {
      const countQuery = { text: `SELECT COUNT(*)::int AS total FROM pedidos ${where}`, values };
      const count = await database.query(countQuery);
      return res.status(200).json({ data: result.rows, meta: { total: count.rows[0].total } });
    }
    return res.status(200).json(result.rows);
  } catch (e) {
    console.error("GET /pedidos error", e);
    if (isRelationMissing(e)) return res.status(503).json({ error: "Schema not migrated (pedidos missing)", dependency: "database", code: e.code, action: "Run migrations" });
    if (isConnectionError(e)) return res.status(503).json({ error: "Database unreachable", dependency: "database", code: e.code });
    return res.status(500).json({ error: "Internal error" });
  }
}
