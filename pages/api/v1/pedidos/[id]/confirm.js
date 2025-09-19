// pages/api/v1/pedidos/[id]/confirm.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: `Method "${req.method}" not allowed` });
  const client = await database.getClient();
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "invalid id" });

    await client.query("BEGIN");
    const head = await client.query({ text: `SELECT * FROM pedidos WHERE id = $1 FOR UPDATE`, values: [id] });
    if (!head.rows.length) return res.status(404).json({ error: "Not found" });
    const pedido = head.rows[0];
    // Com CRUD sem rascunhos, pedidos já nascem confirmados. Mantenha idempotência.
    if (pedido.status === "confirmado") {
      await client.query("ROLLBACK");
      return res.status(200).json({ ok: true, alreadyConfirmed: true });
    }

    const itens = await client.query({ text: `SELECT * FROM pedido_itens WHERE pedido_id = $1 ORDER BY id`, values: [id] });
    const docTag = `PEDIDO:${id}`;

    // Idempotência: se já existem movimentos com documento = docTag, abortar para evitar duplicidade
    const exists = await client.query({ text: `SELECT 1 FROM movimento_estoque WHERE documento = $1 LIMIT 1`, values: [docTag] });
    if (exists.rows.length) {
      await client.query({ text: `UPDATE pedidos SET status = 'confirmado', updated_at = NOW() WHERE id = $1`, values: [id] });
      await client.query("COMMIT");
      return res.status(200).json({ ok: true, alreadyConfirmed: true });
    }

    for (const it of itens.rows) {
      if (pedido.tipo === "VENDA") {
        // Bloqueio de estoque negativo: checar saldo atual
        const saldoQ = await client.query({
          text: `SELECT COALESCE(
                   (SELECT COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN quantidade WHEN tipo='SAIDA' THEN -quantidade ELSE quantidade END),0) FROM movimento_estoque WHERE produto_id = $1)
                 ,0) AS saldo`,
          values: [it.produto_id],
        });
        const saldo = Number(saldoQ.rows[0].saldo || 0);
        if (saldo < Number(it.quantidade)) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: `Saldo insuficiente para produto ${it.produto_id}` });
        }
        await client.query({
          text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, documento, observacao)
                 VALUES ($1,'SAIDA',$2,$3,$4)`,
          values: [it.produto_id, it.quantidade, docTag, `SAÍDA por confirmação de pedido ${id}`],
        });
      } else if (pedido.tipo === "COMPRA") {
        // ENTRADA usando preco_unitario do item para custo
        await client.query({
          text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, valor_total, documento, observacao)
                 VALUES ($1,'ENTRADA',$2,$3,$4,$5,$6)`,
          values: [
            it.produto_id,
            it.quantidade,
            it.preco_unitario,
            Number(it.preco_unitario) * Number(it.quantidade),
            docTag,
            `ENTRADA por confirmação de pedido ${id}`,
          ],
        });
      }
    }

    await client.query({ text: `UPDATE pedidos SET status = 'confirmado', updated_at = NOW() WHERE id = $1`, values: [id] });
    await client.query("COMMIT");
    return res.status(200).json({ ok: true });
  } catch (e) {
    await database.safeRollback(client);
    console.error("POST /pedidos/:id/confirm error", e);
    if (isRelationMissing(e)) return res.status(503).json({ error: "Schema not migrated (pedidos/pedido_itens or movimento_estoque missing)", dependency: "database", code: e.code, action: "Run migrations" });
    if (isConnectionError(e)) return res.status(503).json({ error: "Database unreachable", dependency: "database", code: e.code });
    return res.status(500).json({ error: "Internal error" });
  } finally {
    if (client) {
      try { await client.end(); } catch (_) { /* noop */ }
    }
  }
}
