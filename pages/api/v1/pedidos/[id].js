// pages/api/v1/pedidos/[id].js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method === "GET") return getPedido(req, res);
  if (req.method === "PUT") return putPedido(req, res);
  if (req.method === "DELETE") return deletePedido(req, res);
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

    const b = req.body || {};
    await client.query("BEGIN");

    // 1) Atualizar cabeçalho flexível (agora permite alterar tipo e parceiro)
    const sets = [];
    const values = [];
    const set = (field, value) => { values.push(value); sets.push(`${field} = $${values.length}`); };
    if (b.partner_document !== undefined) set("partner_document", b.partner_document || null);
    if (b.partner_name !== undefined) set("partner_name", b.partner_name || null);
    if (b.data_entrega !== undefined) set("data_entrega", b.data_entrega || null);
    if (b.observacao !== undefined) set("observacao", b.observacao || null);
    if (b.tem_nota_fiscal !== undefined) set("tem_nota_fiscal", b.tem_nota_fiscal);
    if (b.parcelado !== undefined) set("parcelado", b.parcelado);
    if (b.numero_promissorias !== undefined) set("numero_promissorias", Number(b.numero_promissorias) || 1);
    if (b.data_primeira_promissoria !== undefined) set("data_primeira_promissoria", b.data_primeira_promissoria || null);
    // permitir alterar tipo e parceiro (validações básicas)
    let tipoAtual = head.rows[0].tipo;
    if (b.tipo !== undefined) {
      if (!['VENDA', 'COMPRA'].includes(b.tipo)) throw new Error('tipo inválido');
      tipoAtual = b.tipo;
      set('tipo', b.tipo);
    }
    if (b.partner_entity_id !== undefined) {
      const pid = Number(b.partner_entity_id);
      if (!Number.isFinite(pid)) throw new Error('partner_entity_id inválido');
      // verificar ativo
      const ent = await client.query({ text: `SELECT ativo FROM entities WHERE id = $1`, values: [pid] });
      if (!ent.rows.length) throw new Error('Entidade não encontrada');
      if (ent.rows[0].ativo === false) throw new Error('Entidade inativa');
      set('partner_entity_id', pid);
    }
    if (sets.length) {
      sets.push(`updated_at = NOW()`);
      await client.query({ text: `UPDATE pedidos SET ${sets.join(', ')} WHERE id = $${values.length + 1}`, values: [...values, id] });
    }

    // 2) Reprocessar itens e movimentos se itens forem enviados
    if (Array.isArray(b.itens)) {
      const docTag = `PEDIDO:${id}`;
      // apagar movimentos anteriores deste pedido (idempotência)
      await client.query({ text: `DELETE FROM movimento_estoque WHERE documento = $1`, values: [docTag] });
      // apagar itens anteriores
      await client.query({ text: `DELETE FROM pedido_itens WHERE pedido_id = $1`, values: [id] });

      let totalBruto = 0, descontoTotal = 0, totalLiquido = 0;
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

        // reinsert movimentos conforme tipo atual
        if (tipoAtual === 'VENDA') {
          // checar saldo disponível
          const saldoQ = await client.query({
            text: `SELECT COALESCE((
                     SELECT COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN quantidade WHEN tipo='SAIDA' THEN -quantidade ELSE quantidade END),0)
                     FROM movimento_estoque WHERE produto_id = $1
                   ),0) AS saldo`,
            values: [it.produto_id],
          });
          const saldo = Number(saldoQ.rows[0].saldo || 0);
          if (saldo < qtd) throw new Error(`Saldo insuficiente para o produto ${it.produto_id}`);
          await client.query({
            text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, documento, observacao)
                   VALUES ($1,'SAIDA',$2,$3,$4)`,
            values: [it.produto_id, qtd, docTag, `SAÍDA por edição de pedido ${id}`],
          });
        } else if (tipoAtual === 'COMPRA') {
          await client.query({
            text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, valor_total, documento, observacao)
                   VALUES ($1,'ENTRADA',$2,$3,$4,$5,$6)`,
            values: [it.produto_id, qtd, preco, preco * qtd, docTag, `ENTRADA por edição de pedido ${id}`],
          });
        }
      }

      await client.query({
        text: `UPDATE pedidos SET total_bruto = $1, desconto_total = $2, total_liquido = $3, updated_at = NOW() WHERE id = $4`,
        values: [totalBruto, descontoTotal, totalLiquido, id],
      });

      // Calcular valor por promissória se aplicável
      const pedidoAtualizado = await client.query({ text: `SELECT numero_promissorias FROM pedidos WHERE id = $1`, values: [id] });
      const numeroPromissorias = Number(pedidoAtualizado.rows[0]?.numero_promissorias) || 1;
      if (numeroPromissorias > 1 && totalLiquido > 0) {
        const valorPorPromissoria = totalLiquido / numeroPromissorias;
        await client.query({
          text: `UPDATE pedidos SET valor_por_promissoria = $1 WHERE id = $2`,
          values: [valorPorPromissoria, id],
        });
      }
    }

    // 3) Recalcular valor_por_promissoria sempre ao final com base nos valores atuais
    try {
      const headNow = await client.query({
        text: `SELECT total_liquido, numero_promissorias, data_primeira_promissoria FROM pedidos WHERE id = $1`,
        values: [id],
      });
      if (headNow.rows.length) {
        const tl = Number(headNow.rows[0].total_liquido || 0);
        const np = Number(headNow.rows[0].numero_promissorias || 1);
        const firstDate = headNow.rows[0].data_primeira_promissoria;
        if (np > 1 && tl > 0) {
          const vpp = tl / np;
          await client.query({ text: `UPDATE pedidos SET valor_por_promissoria = $1 WHERE id = $2`, values: [vpp, id] });

          // Regenerar cronograma de promissórias se não houver nenhuma paga ainda
          const anyPaid = await client.query({ text: `SELECT 1 FROM pedido_promissorias WHERE pedido_id = $1 AND paid_at IS NOT NULL LIMIT 1`, values: [id] });
          if (!anyPaid.rows.length) {
            // apaga cronograma atual
            await client.query({ text: `DELETE FROM pedido_promissorias WHERE pedido_id = $1`, values: [id] });
            const baseDate = firstDate ? parseDateYMD(firstDate) : new Date();
            const norm = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
            const amt = Number(vpp.toFixed(2));
            for (let i = 0; i < np; i++) {
              const due = new Date(norm);
              due.setMonth(due.getMonth() + i);
              await client.query({
                text: `INSERT INTO pedido_promissorias (pedido_id, seq, due_date, amount) VALUES ($1,$2,$3,$4)`,
                values: [id, i + 1, formatDateYMD(due), amt],
              });
            }
          }
        } else {
          await client.query({ text: `UPDATE pedidos SET valor_por_promissoria = NULL WHERE id = $1`, values: [id] });
          // sem parcelamento: remover cronograma existente (se não houver pago)
          const anyPaid = await client.query({ text: `SELECT 1 FROM pedido_promissorias WHERE pedido_id = $1 AND paid_at IS NOT NULL LIMIT 1`, values: [id] });
          if (!anyPaid.rows.length) {
            await client.query({ text: `DELETE FROM pedido_promissorias WHERE pedido_id = $1`, values: [id] });
          }
        }
      }
    } catch (_) {
      // não falhar PUT por erro na recomputação; continuará com valor anterior
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

async function deletePedido(req, res) {
  const client = await database.getClient();
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    await client.query('BEGIN');
    const head = await client.query({ text: `SELECT id FROM pedidos WHERE id = $1`, values: [id] });
    if (!head.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }
    const docTag = `PEDIDO:${id}`;
    await client.query({ text: `DELETE FROM movimento_estoque WHERE documento = $1`, values: [docTag] });
    await client.query({ text: `DELETE FROM pedido_itens WHERE pedido_id = $1`, values: [id] });
    await client.query({ text: `DELETE FROM pedidos WHERE id = $1`, values: [id] });
    await client.query('COMMIT');
    return res.status(200).json({ ok: true });
  } catch (e) {
    await database.safeRollback(client);
    console.error('DELETE /pedidos/:id error', e);
    if (isRelationMissing(e)) return res.status(503).json({ error: 'Schema not migrated', dependency: 'database', code: e.code, action: 'Run migrations' });
    if (isConnectionError(e)) return res.status(503).json({ error: 'Database unreachable', dependency: 'database', code: e.code });
    return res.status(400).json({ error: e.message || 'Invalid payload' });
  } finally {
    if (client) {
      try { await client.end(); } catch (_) { /* noop */ }
    }
  }
}

function formatDateYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateYMD(input) {
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10) - 1;
      const dd = parseInt(m[3], 10);
      return new Date(y, mm, dd);
    }
  }
  const d = new Date(input);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
