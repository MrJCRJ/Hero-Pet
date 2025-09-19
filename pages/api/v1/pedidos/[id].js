// pages/api/v1/pedidos/[id].js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method === "GET") return getPedido(req, res);
  if (req.method === "PUT") return putPedido(req, res);
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function getPedido(req, res) {
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    const head = await database.query({ text: `SELECT * FROM pedidos WHERE id = $1`, values: [id] });
    if (!head.rows.length) return res.status(404).json({ error: "Not found" });
    const itens = await database.query({
      text: `SELECT i.*, p.nome AS produto_nome, p.codigo_barras FROM pedido_itens i JOIN produtos p ON p.id = i.produto_id WHERE i.pedido_id = $1 ORDER BY i.id`,
      values: [id],
    });
    return res.status(200).json({ ...head.rows[0], itens: itens.rows });
  } catch (e) {
    console.error("GET /pedidos/:id error", e);
    if (isRelationMissing(e)) return res.status(503).json({ error: "Schema not migrated (pedidos/pedido_itens missing)", dependency: "database", code: e.code, action: "Run migrations" });
    if (isConnectionError(e)) return res.status(503).json({ error: "Database unreachable", dependency: "database", code: e.code });
    return res.status(500).json({ error: "Internal error" });
  }
}

async function putPedido(req, res) {
  const client = await database.getClient();
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });
    const head = await client.query({ text: `SELECT * FROM pedidos WHERE id = $1`, values: [id] });
    if (!head.rows.length) return res.status(404).json({ error: "Not found" });
    const isDraft = head.rows[0].status === "rascunho";

    const b = req.body || {};
    await client.query("BEGIN");

    // atualizar cabeçalho simples
    const sets = [];
    const values = [];
    const set = (field, value) => { values.push(value); sets.push(`${field} = $${values.length}`); };
    if (b.partner_entity_id !== undefined) {
      if (!isDraft) return res.status(400).json({ error: "partner_entity_id só pode ser alterado em rascunho" });
      if (b.partner_entity_id == null) return res.status(400).json({ error: "partner_entity_id obrigatório" });
      const pid = Number(b.partner_entity_id);
      if (!Number.isFinite(pid)) return res.status(400).json({ error: "partner_entity_id inválido" });
      const r = await client.query({ text: `SELECT id, ativo FROM entities WHERE id = $1`, values: [pid] });
      if (!r.rows.length) return res.status(400).json({ error: "Entidade não encontrada" });
      if (r.rows[0].ativo === false) return res.status(400).json({ error: "Entidade inativa" });
      set("partner_entity_id", pid);
    }
    if (b.partner_document !== undefined) set("partner_document", b.partner_document || null);
    if (b.partner_name !== undefined) set("partner_name", b.partner_name || null);
    if (b.data_emissao !== undefined) {
      if (!isDraft) return res.status(400).json({ error: "data_emissao só pode ser alterada em rascunho" });
      set("data_emissao", b.data_emissao || null);
    }
    if (b.data_entrega !== undefined) set("data_entrega", b.data_entrega || null);
    if (b.observacao !== undefined) set("observacao", b.observacao || null);
    if (b.tem_nota_fiscal !== undefined) set("tem_nota_fiscal", b.tem_nota_fiscal);
    if (b.parcelado !== undefined) set("parcelado", b.parcelado);
    if (b.total_bruto !== undefined) set("total_bruto", b.total_bruto);
    if (b.desconto_total !== undefined) set("desconto_total", b.desconto_total);
    if (b.total_liquido !== undefined) set("total_liquido", b.total_liquido);
    if (sets.length) {
      sets.push(`updated_at = NOW()`);
      await client.query({ text: `UPDATE pedidos SET ${sets.join(", ")} WHERE id = $${values.length + 1}`, values: [...values, id] });
    }

    // atualizar itens se informado
    let recalcTotals = false;
    let totalBruto = 0, descontoTotal = 0, totalLiquido = 0;
    if (Array.isArray(b.itens)) {
      if (!isDraft) return res.status(400).json({ error: "Itens só podem ser alterados em rascunho" });
      await client.query({ text: `DELETE FROM pedido_itens WHERE pedido_id = $1`, values: [id] });
      for (const it of b.itens) {
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
          values: [id, it.produto_id, qtd, preco, desconto, totalItem],
        });
      }
      recalcTotals = true;
    }

    if (recalcTotals) {
      await client.query({
        text: `UPDATE pedidos SET total_bruto = $1, desconto_total = $2, total_liquido = $3, updated_at = NOW() WHERE id = $4`,
        values: [totalBruto, descontoTotal, totalLiquido, id],
      });
    } else if (sets.length) {
      // já atualizou updated_at acima
    }

    await client.query("COMMIT");
    return res.status(200).json({ ok: true });
  } catch (e) {
    await database.safeRollback(client);
    console.error("PUT /pedidos/:id error", e);
    if (isRelationMissing(e)) return res.status(503).json({ error: "Schema not migrated (pedidos/pedido_itens missing)", dependency: "database", code: e.code, action: "Run migrations" });
    if (isConnectionError(e)) return res.status(503).json({ error: "Database unreachable", dependency: "database", code: e.code });
    return res.status(400).json({ error: e.message || "Invalid payload" });
  } finally {
    if (client) {
      try { await client.end(); } catch (_) { /* noop */ }
    }
  }
}
