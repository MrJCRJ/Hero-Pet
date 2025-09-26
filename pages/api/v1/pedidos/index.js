// pages/api/v1/pedidos/index.js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import { aplicarConsumosFIFO } from "lib/fifo";
import { processarItensVenda } from "lib/pedidos/fifo";

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
    const dataEmissaoStr = parseDateYMD(b.data_emissao) || null;
    const head = await client.query({
      text: `INSERT INTO pedidos (tipo, status, partner_entity_id, partner_document, partner_name, data_emissao, data_entrega, observacao, tem_nota_fiscal, parcelado, numero_promissorias, data_primeira_promissoria)
             VALUES ($1,'confirmado',$2,$3,$4, COALESCE($5::timestamptz, NOW()), $6,$7,$8,$9,$10,$11)
             RETURNING *`,
      values: [
        tipo,
        partnerId,
        b.partner_document || null,
        b.partner_name || null,
        dataEmissaoStr,
        parseDateYMD(b.data_entrega) || null,
        b.observacao || null,
        b.tem_nota_fiscal ?? null,
        b.parcelado ?? null,
        Number(b.numero_promissorias) || 1,
        parseDateYMD(b.data_primeira_promissoria) || null,
      ],
    });
    const pedido = head.rows[0];
    const itensInput = Array.isArray(b.itens) ? b.itens : [];
    let consumosPorItem = [];
    let totalBruto = 0,
      descontoTotal = 0,
      totalLiquido = 0;
    if (tipo === "VENDA") {
      const {
        itens,
        consumosPorItem: cps,
        totais,
      } = await processarItensVenda({
        client,
        itens: itensInput,
        dataEmissao: parseDateYMD(b.data_emissao) || null,
      });
      consumosPorItem = cps;
      totalBruto = totais.totalBruto;
      descontoTotal = totais.descontoTotal;
      totalLiquido = totais.totalLiquido;
      for (const it of itens) {
        await client.query({
          text: `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, desconto_unitario, total_item, custo_unit_venda, custo_total_item)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          values: [
            pedido.id,
            it.produto_id,
            it.quantidade,
            it.preco,
            it.desconto,
            it.total_item,
            it.custo_unit_venda,
            it.custo_total_item,
          ],
        });
      }
    } else {
      // COMPRA mantém lógica simples (sem FIFO aqui por enquanto)
      for (const it of itensInput) {
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
    // Rateio de frete por quantidade total
    const sumQtdCompra = itensCriados.rows.reduce((acc, it) => {
      return acc + Number(it.quantidade);
    }, 0);
    for (const it of itensCriados.rows) {
      if (tipo === "VENDA") {
        const registroConsumo = consumosPorItem.find(
          (c) => c.produto_id === it.produto_id,
        );
        if (!registroConsumo) continue; // segurança
        if (registroConsumo.legacy) {
          // Movimento legado sem custos reconhecidos (continua permitindo vendas de estoque pré-FIFO)
          // A PARTIR DE AGORA (fix produção): ainda que seja consumo legacy (sem lotes),
          // persistimos custo reconhecido usando a média calculada em processarItensVenda
          // para permitir apuração de COGS consistente em relatórios.
          await client.query({
            text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, documento, observacao, origem_tipo, data_movimento, custo_unitario_rec, custo_total_rec)
                   VALUES ($1,'SAIDA',$2,$3,$4,$5, COALESCE($6::timestamptz, NOW()), $7, $8)`,
            values: [
              it.produto_id,
              it.quantidade,
              docTag,
              `SAÍDA (LEGACY AVG COST) por criação de pedido ${pedido.id}`,
              "PEDIDO",
              dataEmissaoStr,
              it.custo_unit_venda, // média calculada
              it.custo_total_item,
            ],
          });
        } else {
          const { consumo } = registroConsumo;
          const mov = await client.query({
            text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, documento, observacao, origem_tipo, custo_unitario_rec, custo_total_rec, data_movimento)
                   VALUES ($1,'SAIDA',$2,$3,$4,$5,$6,$7, COALESCE($8::timestamptz, NOW()))
                   RETURNING id`,
            values: [
              it.produto_id,
              it.quantidade,
              docTag,
              `SAÍDA por criação de pedido ${pedido.id}`,
              "PEDIDO",
              consumo.custo_unitario_medio,
              consumo.custo_total,
              dataEmissaoStr,
            ],
          });
          await aplicarConsumosFIFO({
            client,
            movimentoId: mov.rows[0].id,
            consumos: consumo.consumos.map((c) => ({
              lote_id: c.lote_id,
              quantidade: c.quantidade,
              custo_unitario: c.custo_unitario,
              custo_total: c.custo_total,
            })),
          });
        }
      } else if (tipo === "COMPRA") {
        const qtd = Number(it.quantidade);
        const preco = Number(it.preco_unitario);
        const base = preco * qtd;
        const shareRaw =
          freteTotalNumber > 0 && sumQtdCompra > 0
            ? (freteTotalNumber * qtd) / sumQtdCompra
            : 0;
        const share = Number(shareRaw.toFixed(2));
        const valorTotal = Number((base + share).toFixed(2));
        const valorUnit = valorTotal / qtd;
        const movEnt = await client.query({
          text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, origem_tipo, data_movimento)
                 VALUES ($1,'ENTRADA',$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10::timestamptz, NOW()))
                 RETURNING id`,
          values: [
            it.produto_id,
            qtd,
            valorUnit,
            share,
            0,
            valorTotal,
            docTag,
            `ENTRADA por criação de pedido ${pedido.id} (rateio de frete)`,
            "PEDIDO",
            dataEmissaoStr,
          ],
        });
        // Criar lote FIFO correspondente para permitir consumo futuro
        await client.query({
          text: `INSERT INTO estoque_lote (produto_id, quantidade_inicial, quantidade_disponivel, custo_unitario, valor_total, origem_tipo, origem_movimento_id, data_entrada, documento, observacao)
                 VALUES ($1,$2,$3,$4,$5,$6,$7, COALESCE($8::timestamptz, NOW()),$9,$10)`,
          values: [
            it.produto_id,
            qtd,
            qtd,
            valorUnit,
            valorTotal,
            "ENTRADA",
            movEnt.rows[0].id,
            dataEmissaoStr,
            docTag,
            `LOTE gerado por pedido ${pedido.id}`,
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
      // Normaliza e tenta match de ID (#123 ou 123)
      const m = String(q)
        .trim()
        .match(/^#?(\d+)$/);
      if (m) {
        const idNum = parseInt(m[1], 10);
        if (Number.isFinite(idNum)) {
          values.push(idNum);
          clauses.push(`p.id = $${values.length}`);
        }
      } else {
        // Busca textual por parceiro/documento
        values.push(`%${q}%`);
        const idx = values.length;
        clauses.push(
          `(p.partner_name ILIKE $${idx} OR p.partner_document ILIKE $${idx})`,
        );
      }
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
                    COALESCE(SUM(CASE WHEN pp.paid_at IS NOT NULL THEN pp.amount ELSE 0 END), 0)::numeric(14,2) AS total_pago,
                    p.frete_total,
                    /* fifo_aplicado: true se todos movimentos SAIDA do pedido possuem custo_total_rec > 0
                       - Pedido VENDA sem movimentos SAIDA (caso incomum) => false
                       - Pedidos COMPRA sempre true (não se aplica custo de venda) */
                    CASE 
                      WHEN p.tipo = 'COMPRA' THEN true
                      WHEN EXISTS (
                        SELECT 1 FROM movimento_estoque m
                         WHERE m.documento = ('PEDIDO:'||p.id) AND m.tipo='SAIDA'
                      ) AND NOT EXISTS (
                        SELECT 1 FROM movimento_estoque m
                         WHERE m.documento = ('PEDIDO:'||p.id) AND m.tipo='SAIDA' AND (m.custo_total_rec IS NULL OR m.custo_total_rec = 0)
                      ) THEN true
                      ELSE false
                    END AS fifo_aplicado
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
