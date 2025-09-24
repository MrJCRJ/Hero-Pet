// pages/api/v1/pedidos/index.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";

export default async function handler(req, res) {
  if (req.method === "POST") return postPedido(req, res);
  if (req.method === "GET") return getPedidos(req, res);
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

function parseDateYMD(ymd) {
  // Espera 'YYYY-MM-DD'. Cria Date no fuso local à meia-noite e retorna string 'YYYY-MM-DD'
  if (!ymd || typeof ymd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ymd))
    return null;
  return ymd;
}

function formatDateYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Converte entrada (string 'YYYY-MM-DD' ou Date) em Date normalizada (meia-noite local)
function toLocalMidnightDate(input) {
  if (!input) return new Date();
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (input instanceof Date && !isNaN(input)) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
  }
  return new Date();
}

async function postPedido(req, res) {
  const client = await database.getClient();
  try {
    const b = req.body || {};
    const tipo = b.tipo;
    if (!["VENDA", "COMPRA"].includes(tipo))
      return res.status(400).json({ error: "tipo inválido" });

    // cliente/fornecedor: obrigatório e ativo
    const partnerIdRaw = b.partner_entity_id;
    if (partnerIdRaw == null)
      return res.status(400).json({ error: "partner_entity_id obrigatório" });
    const partnerId = Number(partnerIdRaw);
    if (!Number.isFinite(partnerId))
      return res.status(400).json({ error: "partner_entity_id inválido" });
    const r = await client.query({
      text: `SELECT id, ativo FROM entities WHERE id = $1`,
      values: [partnerId],
    });
    if (!r.rows.length)
      return res.status(400).json({ error: "Entidade não encontrada" });
    if (r.rows[0].ativo === false)
      return res.status(400).json({ error: "Entidade inativa" });

    await client.query("BEGIN");
    const head = await client.query({
      text: `INSERT INTO pedidos (tipo, status, partner_entity_id, partner_document, partner_name, data_emissao, data_entrega, observacao, tem_nota_fiscal, parcelado, numero_promissorias, data_primeira_promissoria)
             VALUES ($1,'confirmado',$2,$3,$4, COALESCE($5::timestamptz, NOW()), $6,$7,$8,$9,$10,$11)
             RETURNING *`,
      values: [
        tipo,
        partnerId,
        b.partner_document || null,
        b.partner_name || null,
        parseDateYMD(b.data_emissao) || null,
        parseDateYMD(b.data_entrega) || null,
        b.observacao || null,
        b.tem_nota_fiscal ?? null,
        b.parcelado ?? null,
        Number(b.numero_promissorias) || 1,
        parseDateYMD(b.data_primeira_promissoria) || null,
      ],
    });
    const pedido = head.rows[0];

    const itens = Array.isArray(b.itens) ? b.itens : [];
    let totalBruto = 0;
    let descontoTotal = 0;
    let totalLiquido = 0; // sem frete
    for (const it of itens) {
      const rProd = await client.query({
        text: `SELECT id, preco_tabela FROM produtos WHERE id = $1`,
        values: [it.produto_id],
      });
      if (!rProd.rows.length)
        throw new Error(`produto_id inválido: ${it.produto_id}`);
      const qtd = Number(it.quantidade);
      if (!Number.isFinite(qtd) || qtd <= 0)
        throw new Error(`quantidade inválida`);
      const preco =
        it.preco_unitario != null
          ? Number(it.preco_unitario)
          : Number(rProd.rows[0].preco_tabela ?? 0);
      const desconto =
        it.desconto_unitario != null ? Number(it.desconto_unitario) : 0;
      const totalItem = (preco - desconto) * qtd; // mantém sem frete
      totalBruto += preco * qtd;
      descontoTotal += desconto * qtd;
      totalLiquido += totalItem;
      await client.query({
        text: `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, desconto_unitario, total_item)
               VALUES ($1,$2,$3,$4,$5,$6)`,
        values: [pedido.id, it.produto_id, qtd, preco, desconto, totalItem],
      });
    }
    const freteTotal = b.frete_total != null ? Number(b.frete_total) : 0;
    // Atualiza totais calculados
    await client.query({
      text: `UPDATE pedidos SET total_bruto = $1, desconto_total = $2, total_liquido = $3, frete_total = $4, updated_at = NOW() WHERE id = $5`,
      values: [
        totalBruto,
        descontoTotal,
        totalLiquido,
        freteTotal > 0 ? freteTotal : null,
        pedido.id,
      ],
    });

    // Calcular valor por promissória se aplicável
    const numeroPromissorias = Number(b.numero_promissorias) || 1;
    const baseParcelamento = totalLiquido + (freteTotal > 0 ? freteTotal : 0); // inclui frete no parcelamento
    if (numeroPromissorias >= 1 && baseParcelamento > 0) {
      const valorPorPromissoria = baseParcelamento / numeroPromissorias;
      await client.query({
        text: `UPDATE pedidos SET valor_por_promissoria = $1 WHERE id = $2`,
        values: [valorPorPromissoria, pedido.id],
      });
    }

    // (Re)gerar tabela de promissórias para o pedido recém criado
    if (
      numeroPromissorias >= 1 &&
      totalLiquido + (freteTotal > 0 ? freteTotal : 0) > 0
    ) {
      const amount = Number((baseParcelamento / numeroPromissorias).toFixed(2));
      const datas = Array.isArray(b.promissoria_datas)
        ? b.promissoria_datas.filter((s) =>
            /^(\d{4})-(\d{2})-(\d{2})$/.test(String(s)),
          )
        : [];
      if (datas.length >= numeroPromissorias) {
        for (let i = 0; i < numeroPromissorias; i++) {
          await client.query({
            text: `INSERT INTO pedido_promissorias (pedido_id, seq, due_date, amount) VALUES ($1,$2,$3,$4)`,
            values: [pedido.id, i + 1, datas[i], amount],
          });
        }
      } else {
        // Fallback: mensal a partir da primeira data
        const firstDate = b.data_primeira_promissoria
          ? parseDateYMD(b.data_primeira_promissoria)
          : null;
        const baseDate = toLocalMidnightDate(firstDate || new Date());
        for (let i = 0; i < numeroPromissorias; i++) {
          const due = new Date(baseDate);
          due.setMonth(due.getMonth() + i);
          await client.query({
            text: `INSERT INTO pedido_promissorias (pedido_id, seq, due_date, amount) VALUES ($1,$2,$3,$4)`,
            values: [pedido.id, i + 1, formatDateYMD(due), amount],
          });
        }
      }
    }
    // Gerar movimentos de estoque imediatamente (CRUD sem rascunho)
    const docTag = `PEDIDO:${pedido.id}`;
    const itensCriados = await client.query({
      text: `SELECT * FROM pedido_itens WHERE pedido_id = $1 ORDER BY id`,
      values: [pedido.id],
    });
    // Pré-cálculo para rateio de frete em COMPRA
    const freteTotalNumber = Number(b.frete_total || 0);
    const sumBaseCompra = itensCriados.rows.reduce((acc, it) => {
      return acc + Number(it.preco_unitario) * Number(it.quantidade);
    }, 0);
    for (const it of itensCriados.rows) {
      if (tipo === "VENDA") {
        // checa saldo disponível
        const saldoQ = await client.query({
          text: `SELECT COALESCE((
                   SELECT COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN quantidade WHEN tipo='SAIDA' THEN -quantidade ELSE quantidade END),0)
                   FROM movimento_estoque WHERE produto_id = $1
                 ),0) AS saldo`,
          values: [it.produto_id],
        });
        const saldo = Number(saldoQ.rows[0].saldo || 0);
        if (saldo < Number(it.quantidade)) {
          // buscar nome do produto para mensagem mais amigável
          const pinfo = await client.query({
            text: `SELECT nome FROM produtos WHERE id = $1`,
            values: [it.produto_id],
          });
          const pnome = pinfo.rows?.[0]?.nome || String(it.produto_id);
          await client.query("ROLLBACK");
          return res.status(400).json({
            error: `Saldo insuficiente para o produto "${pnome}" (ID ${it.produto_id})`,
          });
        }
        await client.query({
          text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, documento, observacao)
                 VALUES ($1,'SAIDA',$2,$3,$4)`,
          values: [
            it.produto_id,
            it.quantidade,
            docTag,
            `SAÍDA por criação de pedido ${pedido.id}`,
          ],
        });
      } else if (tipo === "COMPRA") {
        const base = Number(it.preco_unitario) * Number(it.quantidade);
        const share =
          freteTotalNumber > 0 && sumBaseCompra > 0
            ? (freteTotalNumber * base) / sumBaseCompra
            : 0;
        const valorTotal = base + share;
        const valorUnit = valorTotal / Number(it.quantidade);
        await client.query({
          text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, valor_total, documento, observacao)
                 VALUES ($1,'ENTRADA',$2,$3,$4,$5,$6)`,
          values: [
            it.produto_id,
            it.quantidade,
            valorUnit,
            valorTotal,
            docTag,
            `ENTRADA por criação de pedido ${pedido.id} (rateio de frete)`,
          ],
        });
      }
    }

    const finalHead = await client.query({
      text: `SELECT * FROM pedidos WHERE id = $1`,
      values: [pedido.id],
    });

    await client.query("COMMIT");
    return res.status(201).json(finalHead.rows[0]);
  } catch (e) {
    await database.safeRollback(client);
    console.error("POST /pedidos error", e);
    if (isRelationMissing(e))
      return res.status(503).json({
        error: "Schema not migrated (pedidos|pedido_itens missing)",
        dependency: "database",
        code: e.code,
        action: "Run migrations",
      });
    if (isConnectionError(e))
      return res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: e.code,
      });
    return res.status(400).json({ error: e.message || "Invalid payload" });
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (_) {
        /* noop */
      }
    }
  }
}

// removed duplicate helpers (now defined at top)

async function getPedidos(req, res) {
  try {
    const { status, tipo, q, from, to, limit, offset, meta } = req.query;
    const clauses = [];
    const values = [];
    if (tipo) {
      if (!["VENDA", "COMPRA"].includes(tipo))
        return res.status(400).json({ error: "tipo inválido" });
      values.push(tipo);
      clauses.push(`tipo = $${values.length}`);
    }
    if (status) {
      if (!["confirmado", "cancelado"].includes(status))
        return res.status(400).json({ error: "status inválido" });
      values.push(status);
      clauses.push(`status = $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      clauses.push(
        `(partner_name ILIKE $${values.length} OR partner_document ILIKE $${values.length})`,
      );
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
      text: `SELECT p.id, p.tipo, p.status, p.partner_entity_id, p.partner_document,
                    COALESCE(p.partner_name, e.name) AS partner_name,
                    to_char(p.data_emissao, 'YYYY-MM-DD') AS data_emissao,
                    to_char(p.data_entrega, 'YYYY-MM-DD') AS data_entrega,
                    p.total_liquido, p.tem_nota_fiscal, p.parcelado,
                    p.numero_promissorias, to_char(p.data_primeira_promissoria, 'YYYY-MM-DD') AS data_primeira_promissoria, p.valor_por_promissoria, p.created_at,
                    COALESCE(SUM(CASE WHEN pp.paid_at IS NOT NULL THEN pp.amount ELSE 0 END), 0)::numeric(14,2) AS total_pago
          , p.frete_total
        FROM pedidos p
             LEFT JOIN entities e ON e.id = p.partner_entity_id
             LEFT JOIN pedido_promissorias pp ON pp.pedido_id = p.id
             ${where.replace(/\bFROM pedidos\b/, "FROM pedidos p")}
             GROUP BY p.id, e.name
             ORDER BY p.data_emissao DESC, p.id DESC
             LIMIT ${effectiveLimit} OFFSET ${effectiveOffset}`,
      values,
    };
    const result = await database.query(listQuery);
    if (String(meta) === "1") {
      const countQuery = {
        text: `SELECT COUNT(*)::int AS total FROM pedidos ${where}`,
        values,
      };
      const count = await database.query(countQuery);
      return res
        .status(200)
        .json({ data: result.rows, meta: { total: count.rows[0].total } });
    }
    return res.status(200).json(result.rows);
  } catch (e) {
    console.error("GET /pedidos error", e);
    if (isRelationMissing(e))
      return res.status(503).json({
        error: "Schema not migrated (pedidos missing)",
        dependency: "database",
        code: e.code,
        action: "Run migrations",
      });
    if (isConnectionError(e))
      return res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: e.code,
      });
    return res.status(500).json({ error: "Internal error" });
  }
}
