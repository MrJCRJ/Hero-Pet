// pages/api/v1/pedidos/[id].js
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import { aplicarConsumosFIFO } from "lib/fifo";
import { processarItensVenda } from "lib/pedidos/fifo";

export default async function handler(req, res) {
  if (req.method === "GET") return getPedido(req, res);
  if (req.method === "PUT") return putPedido(req, res);
  if (req.method === "DELETE") return deletePedido(req, res);
  return res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

function parseDateYMD(ymd) {
  if (!ymd || typeof ymd !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(ymd))
    return null;
  return ymd;
}

async function getPedido(req, res) {
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "invalid id" });
    const head = await database.query({
      text: `SELECT pedidos.*,
        CASE
          WHEN tipo = 'COMPRA' THEN true
          WHEN EXISTS (
            SELECT 1 FROM movimento_estoque m
             WHERE m.documento = ('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA'
          )
          AND NOT EXISTS (
            SELECT 1 FROM movimento_estoque m
             WHERE m.documento = ('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA' AND (m.custo_total_rec IS NULL OR m.custo_total_rec = 0)
          )
          AND NOT EXISTS (
            SELECT 1 FROM movimento_estoque m
            LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
             WHERE m.documento = ('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA' AND mc.id IS NULL
          )
          THEN true
          ELSE false
        END AS fifo_aplicado,
        CASE
          WHEN tipo='COMPRA' THEN 'fifo'
          WHEN (
            EXISTS (SELECT 1 FROM movimento_estoque m WHERE m.documento=('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA')
            AND NOT EXISTS (
              SELECT 1 FROM movimento_estoque m
              WHERE m.documento=('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA' AND (m.custo_total_rec IS NULL OR m.custo_total_rec = 0)
            )
            AND NOT EXISTS (
              SELECT 1 FROM movimento_estoque m
              LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
              WHERE m.documento=('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA' AND mc.id IS NULL
            )
          ) THEN 'fifo'
          WHEN tipo='VENDA'
            AND EXISTS (SELECT 1 FROM movimento_estoque m WHERE m.documento=('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA')
            AND EXISTS (
              SELECT 1 FROM movimento_estoque m
              LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
              WHERE m.documento=('PEDIDO:'||pedidos.id) AND m.tipo='SAIDA' AND mc.id IS NULL
            )
            AND NOT EXISTS (
              SELECT 1 FROM pedido_itens i
              LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(l.quantidade_disponivel),0) AS disponivel
                FROM estoque_lote l WHERE l.produto_id = i.produto_id
              ) ld ON true
              WHERE i.pedido_id = pedidos.id AND ld.disponivel < i.quantidade
            )
          THEN 'eligible'
          ELSE 'legacy'
        END AS fifo_state
        FROM pedidos WHERE id = $1`,
      values: [id],
    });
    if (!head.rows.length) return res.status(404).json({ error: "Not found" });
    const itens = await database.query({
      text: `SELECT i.*, p.nome AS produto_nome, p.codigo_barras FROM pedido_itens i JOIN produtos p ON p.id = i.produto_id WHERE i.pedido_id = $1 ORDER BY i.id`,
      values: [id],
    });
    // Attach promissorias schedule (same shape as list endpoint)
    const promissorias = await database.query({
      text: `SELECT id, pedido_id, seq,
                    to_char(due_date, 'YYYY-MM-DD') AS due_date,
                    amount, paid_at,
                    CASE 
                      WHEN paid_at IS NOT NULL THEN 'PAGO'
                      WHEN due_date < CURRENT_DATE THEN 'ATRASADO'
                      ELSE 'PENDENTE'
                    END AS status
             FROM pedido_promissorias WHERE pedido_id = $1 ORDER BY seq`,
      values: [id],
    });
    return res.status(200).json({
      ...head.rows[0],
      itens: itens.rows,
      promissorias: promissorias.rows,
    });
  } catch (e) {
    console.error("GET /pedidos/:id error", e);
    if (isRelationMissing(e))
      return res.status(503).json({
        error: "Schema not migrated (pedidos/pedido_itens missing)",
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

async function putPedido(req, res) {
  const client = await database.getClient();
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "invalid id" });
    const head = await client.query({
      text: `SELECT * FROM pedidos WHERE id = $1`,
      values: [id],
    });
    if (!head.rows.length) return res.status(404).json({ error: "Not found" });

    const b = req.body || {};
    await client.query("BEGIN");

    // 1) Atualizar cabeçalho flexível (agora permite alterar tipo e parceiro)
    const sets = [];
    const values = [];
    const set = (field, value) => {
      values.push(value);
      sets.push(`${field} = $${values.length}`);
    };
    if (b.partner_document !== undefined)
      set("partner_document", b.partner_document || null);
    if (b.data_emissao !== undefined)
      set("data_emissao", parseDateYMD(b.data_emissao) || null);
    if (b.partner_name !== undefined)
      set("partner_name", b.partner_name || null);
    if (b.data_entrega !== undefined)
      set("data_entrega", parseDateYMD(b.data_entrega) || null);
    if (b.observacao !== undefined) set("observacao", b.observacao || null);
    if (b.tem_nota_fiscal !== undefined)
      set("tem_nota_fiscal", b.tem_nota_fiscal);
    if (b.parcelado !== undefined) set("parcelado", b.parcelado);
    if (b.numero_promissorias !== undefined)
      set("numero_promissorias", Number(b.numero_promissorias) || 1);
    if (b.data_primeira_promissoria !== undefined)
      set(
        "data_primeira_promissoria",
        parseDateYMD(b.data_primeira_promissoria) || null,
      );
    // permitir atualizar frete_total mesmo sem reenviar itens (escopo agregado atual)
    if (b.frete_total !== undefined) {
      const ftNum = Number(b.frete_total);
      if (!Number.isNaN(ftNum) && ftNum > 0) {
        set("frete_total", ftNum);
      } else {
        // zera se enviado 0 ou null
        set("frete_total", null);
      }
    }
    // permitir alterar tipo e parceiro (validações básicas)
    let tipoAtual = head.rows[0].tipo;
    if (b.tipo !== undefined) {
      if (!["VENDA", "COMPRA"].includes(b.tipo))
        throw new Error("tipo inválido");
      tipoAtual = b.tipo;
      set("tipo", b.tipo);
    }
    if (b.partner_entity_id !== undefined) {
      const pid = Number(b.partner_entity_id);
      if (!Number.isFinite(pid)) throw new Error("partner_entity_id inválido");
      // verificar ativo
      const ent = await client.query({
        text: `SELECT ativo FROM entities WHERE id = $1`,
        values: [pid],
      });
      if (!ent.rows.length) throw new Error("Entidade não encontrada");
      if (ent.rows[0].ativo === false) throw new Error("Entidade inativa");
      set("partner_entity_id", pid);
    }
    if (sets.length) {
      sets.push(`updated_at = NOW()`);
      await client.query({
        text: `UPDATE pedidos SET ${sets.join(", ")} WHERE id = $${values.length + 1}`,
        values: [...values, id],
      });
    }

    const docTag = `PEDIDO:${id}`;
    // 2) Reprocessar itens e movimentos se itens forem enviados
    //    OU se flag migrar_fifo = true for passada (aplica FIFO a pedido legacy sem reenviar itens)
    const migrarFifo = b.migrar_fifo === true || b.migrar_fifo === "true";
    if (Array.isArray(b.itens) || migrarFifo) {
      let itensPayload = Array.isArray(b.itens) ? b.itens : null;
      if (!itensPayload) {
        // carregar itens atuais para reprocessamento
        const itensExistentes = await client.query({
          text: `SELECT produto_id, quantidade, preco_unitario AS preco_unitario, desconto_unitario AS desconto_unitario
                 FROM pedido_itens WHERE pedido_id = $1 ORDER BY id`,
          values: [id],
        });
        itensPayload = itensExistentes.rows.map((r) => ({
          produto_id: r.produto_id,
          quantidade: Number(r.quantidade),
          preco_unitario:
            r.preco_unitario != null ? Number(r.preco_unitario) : null,
          desconto_unitario:
            r.desconto_unitario != null ? Number(r.desconto_unitario) : null,
        }));
      }
      // --- FASE 0: Restaurar consumos FIFO anteriores (se VENDA) antes de deletar movimentos ---
      if (head.rows[0].tipo === "VENDA") {
        // Buscar movimentos SAIDA do pedido com custos reconhecidos
        const movs = await client.query({
          text: `SELECT id FROM movimento_estoque WHERE documento = $1 AND tipo='SAIDA'`,
          values: [docTag],
        });
        for (const m of movs.rows) {
          const consumos = await client.query({
            text: `SELECT lote_id, quantidade_consumida FROM movimento_consumo_lote WHERE movimento_id=$1`,
            values: [m.id],
          });
          for (const c of consumos.rows) {
            // devolve quantidade para o lote
            await client.query({
              text: `UPDATE estoque_lote SET quantidade_disponivel = quantidade_disponivel + $1 WHERE id=$2`,
              values: [c.quantidade_consumida, c.lote_id],
            });
          }
          // pivot será removido em cascade ao deletar movimento (onDelete CASCADE) mas já restauramos saldos.
        }
      }

      // apagar movimentos anteriores deste pedido (idempotência)
      // COMPRA: precisamos primeiro remover lotes criados a partir dos movimentos de ENTRADA (FK restrict)
      if (head.rows[0].tipo === "COMPRA") {
        const movsEntrada = await client.query({
          text: `SELECT id FROM movimento_estoque WHERE documento = $1 AND tipo='ENTRADA'`,
          values: [docTag],
        });
        for (const m of movsEntrada.rows) {
          const lotes = await client.query({
            text: `SELECT id, quantidade_inicial, quantidade_disponivel FROM estoque_lote WHERE origem_movimento_id = $1`,
            values: [m.id],
          });
          // Se algum lote já foi parcialmente consumido, bloquear edição para evitar inconsistência histórica
          for (const l of lotes.rows) {
            if (
              Number(l.quantidade_disponivel) < Number(l.quantidade_inicial)
            ) {
              throw new Error(
                "Não é possível editar itens: já existem consumos de estoque desta compra",
              );
            }
          }
          // Remover lotes (SEM consumo) antes de remover movimentos
          if (lotes.rows.length) {
            await client.query({
              text: `DELETE FROM estoque_lote WHERE origem_movimento_id = $1`,
              values: [m.id],
            });
          }
        }
      }
      await client.query({
        text: `DELETE FROM movimento_estoque WHERE documento = $1`,
        values: [docTag],
      });
      // apagar itens anteriores
      await client.query({
        text: `DELETE FROM pedido_itens WHERE pedido_id = $1`,
        values: [id],
      });

      let totalBruto = 0,
        descontoTotal = 0,
        totalLiquido = 0; // sem frete
      const itensForRateio = [];
      let consumosPorItem = [];
      const freteTotal = b.frete_total != null ? Number(b.frete_total) : 0;

      if (tipoAtual === "VENDA") {
        const {
          itens: itensVenda,
          consumosPorItem: cps,
          totais,
        } = await processarItensVenda({
          client,
          itens: itensPayload,
          dataEmissao: parseDateYMD(b.data_emissao) || null,
        });
        totalBruto = totais.totalBruto;
        descontoTotal = totais.descontoTotal;
        totalLiquido = totais.totalLiquido;
        consumosPorItem = cps;
        for (const it of itensVenda) {
          await client.query({
            text: `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, desconto_unitario, total_item, custo_unit_venda, custo_total_item)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            values: [
              id,
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
        // COMPRA
        for (const it of itensPayload) {
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
            values: [id, it.produto_id, qtd, preco, desconto, totalItem],
          });
          itensForRateio.push({
            produto_id: it.produto_id,
            quantidade: qtd,
            preco_unitario: preco,
            base: preco * qtd,
          });
        }
      }
      // Regerar movimentos conforme tipo
      if (tipoAtual === "VENDA") {
        const itensInseridos = await client.query({
          text: `SELECT * FROM pedido_itens WHERE pedido_id=$1 ORDER BY id`,
          values: [id],
        });
        for (const it of itensInseridos.rows) {
          const registroConsumo = consumosPorItem.find(
            (c) => c.produto_id === it.produto_id,
          );
          if (!registroConsumo) continue;
          if (registroConsumo.legacy) {
            // FIX: registrar custo reconhecido mesmo em modo legacy (média histórica) para consolidar COGS
            await client.query({
              text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, documento, observacao, origem_tipo, custo_unitario_rec, custo_total_rec)
                     VALUES ($1,'SAIDA',$2,$3,$4,$5,$6,$7)`,
              values: [
                it.produto_id,
                it.quantidade,
                docTag,
                `SAÍDA (LEGACY AVG COST) por edição de pedido ${id}`,
                "PEDIDO",
                it.custo_unit_venda,
                it.custo_total_item,
              ],
            });
          } else {
            const { consumo } = registroConsumo;
            const mov = await client.query({
              text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, documento, observacao, origem_tipo, custo_unitario_rec, custo_total_rec)
                     VALUES ($1,'SAIDA',$2,$3,$4,$5,$6,$7) RETURNING id`,
              values: [
                it.produto_id,
                it.quantidade,
                docTag,
                `SAÍDA por edição de pedido ${id}`,
                "PEDIDO",
                consumo.custo_unitario_medio,
                consumo.custo_total,
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
        }
      } else if (tipoAtual === "COMPRA" && itensForRateio.length) {
        const sumQtd = itensForRateio.reduce((acc, r) => acc + r.quantidade, 0);
        for (const r of itensForRateio) {
          const shareRaw =
            freteTotal > 0 && sumQtd > 0
              ? (freteTotal * r.quantidade) / sumQtd
              : 0;
          const share = Number(shareRaw.toFixed(2));
          const valorTotal = Number((r.base + share).toFixed(2));
          const valorUnit = valorTotal / r.quantidade;
          await client.query({
            text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao)
                   VALUES ($1,'ENTRADA',$2,$3,$4,$5,$6,$7,$8)`,
            values: [
              r.produto_id,
              r.quantidade,
              valorUnit,
              share,
              0,
              valorTotal,
              docTag,
              `ENTRADA por edição de pedido ${id} (rateio de frete)`,
            ],
          });
        }
      }

      await client.query({
        text: `UPDATE pedidos SET total_bruto=$1, desconto_total=$2, total_liquido=$3, frete_total=$4, updated_at=NOW() WHERE id=$5`,
        values: [
          totalBruto,
          descontoTotal,
          totalLiquido,
          freteTotal > 0 ? freteTotal : null,
          id,
        ],
      });

      // valor_por_promissoria recalculado abaixo em bloco comum
      const pedidoAtualizado = await client.query({
        text: `SELECT numero_promissorias FROM pedidos WHERE id = $1`,
        values: [id],
      });
      const numeroPromissorias =
        Number(pedidoAtualizado.rows[0]?.numero_promissorias) || 1;
      if (numeroPromissorias >= 1 && totalLiquido + freteTotal > 0) {
        const valorPorPromissoria =
          (totalLiquido + freteTotal) / numeroPromissorias;
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
        // buscar frete_total atual para compor valor_por_promissoria
        const freteQ = await client.query({
          text: `SELECT frete_total FROM pedidos WHERE id = $1`,
          values: [id],
        });
        const ft = Number(freteQ.rows?.[0]?.frete_total || 0);
        const np = Number(headNow.rows[0].numero_promissorias || 1);
        const firstDate = headNow.rows[0].data_primeira_promissoria;
        const baseParcelamento = tl + ft;
        if (np >= 1 && baseParcelamento > 0) {
          const vpp = baseParcelamento / np;
          await client.query({
            text: `UPDATE pedidos SET valor_por_promissoria = $1 WHERE id = $2`,
            values: [vpp, id],
          });

          // Regenerar cronograma de promissórias se não houver nenhuma paga ainda
          const anyPaid = await client.query({
            text: `SELECT 1 FROM pedido_promissorias WHERE pedido_id = $1 AND paid_at IS NOT NULL LIMIT 1`,
            values: [id],
          });
          if (!anyPaid.rows.length) {
            // apaga cronograma atual
            await client.query({
              text: `DELETE FROM pedido_promissorias WHERE pedido_id = $1`,
              values: [id],
            });
            const amt = Number(vpp.toFixed(2));
            const datas = Array.isArray(b.promissoria_datas)
              ? b.promissoria_datas.filter((s) =>
                  /^(\d{4})-(\d{2})-(\d{2})$/.test(String(s)),
                )
              : [];
            if (datas.length >= np) {
              for (let i = 0; i < np; i++) {
                await client.query({
                  text: `INSERT INTO pedido_promissorias (pedido_id, seq, due_date, amount) VALUES ($1,$2,$3,$4)`,
                  values: [id, i + 1, datas[i], amt],
                });
              }
            } else {
              // Normaliza baseDate aceitando string 'YYYY-MM-DD' ou Date
              const toLocalMidnight = (input) => {
                if (!input) return new Date();
                if (
                  typeof input === "string" &&
                  /^\d{4}-\d{2}-\d{2}$/.test(input)
                ) {
                  const [y, m, d] = input.split("-").map(Number);
                  return new Date(y, m - 1, d);
                }
                if (input instanceof Date && !isNaN(input)) {
                  return new Date(
                    input.getFullYear(),
                    input.getMonth(),
                    input.getDate(),
                  );
                }
                return new Date();
              };
              const norm = toLocalMidnight(firstDate || new Date());
              const fmtYMD = (d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                return `${y}-${m}-${dd}`;
              };
              for (let i = 0; i < np; i++) {
                const due = new Date(norm);
                due.setMonth(due.getMonth() + i);
                await client.query({
                  text: `INSERT INTO pedido_promissorias (pedido_id, seq, due_date, amount) VALUES ($1,$2,$3,$4)`,
                  values: [id, i + 1, fmtYMD(due), amt],
                });
              }
            }
          }

          // 2b) Se não reenvia itens mas atualiza frete_total em COMPRA, reconstituir movimentos com rateio do frete
          else if (b.frete_total !== undefined && tipoAtual === "COMPRA") {
            // apagar movimentos anteriores deste pedido
            await client.query({
              text: `DELETE FROM movimento_estoque WHERE documento = $1`,
              values: [docTag],
            });
            // buscar itens atuais do pedido
            const itensAtuais = await client.query({
              text: `SELECT produto_id, quantidade, preco_unitario FROM pedido_itens WHERE pedido_id = $1 ORDER BY id`,
              values: [id],
            });
            const rows = itensAtuais.rows || [];
            const sumQtd = rows.reduce(
              (acc, it) => acc + Number(it.quantidade),
              0,
            );
            const freteTotal = Number(b.frete_total || 0);
            for (const it of rows) {
              const base = Number(it.preco_unitario) * Number(it.quantidade);
              const shareRaw =
                freteTotal > 0 && sumQtd > 0
                  ? (freteTotal * Number(it.quantidade)) / sumQtd
                  : 0;
              const share = Number(shareRaw.toFixed(2));
              const valorTotal = Number((base + share).toFixed(2));
              const valorUnit = valorTotal / Number(it.quantidade);
              await client.query({
                text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao)
                       VALUES ($1,'ENTRADA',$2,$3,$4,$5,$6,$7,$8)`,
                values: [
                  it.produto_id,
                  it.quantidade,
                  valorUnit,
                  share,
                  0,
                  valorTotal,
                  docTag,
                  `ENTRADA por edição de pedido ${id} (rateio de frete)`,
                ],
              });
            }
          }
        } else {
          await client.query({
            text: `UPDATE pedidos SET valor_por_promissoria = NULL WHERE id = $1`,
            values: [id],
          });
          // sem parcelamento: remover cronograma existente (se não houver pago)
          const anyPaid = await client.query({
            text: `SELECT 1 FROM pedido_promissorias WHERE pedido_id = $1 AND paid_at IS NOT NULL LIMIT 1`,
            values: [id],
          });
          if (!anyPaid.rows.length) {
            await client.query({
              text: `DELETE FROM pedido_promissorias WHERE pedido_id = $1`,
              values: [id],
            });
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
    if (isRelationMissing(e))
      return res.status(503).json({
        error: "Schema not migrated (pedidos/pedido_itens missing)",
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

async function deletePedido(req, res) {
  const client = await database.getClient();
  try {
    const id = Number(req.query.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ error: "invalid id" });
    await client.query("BEGIN");
    const head = await client.query({
      text: `SELECT id FROM pedidos WHERE id = $1`,
      values: [id],
    });
    if (!head.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found" });
    }
    const docTag = `PEDIDO:${id}`;
    await client.query({
      text: `DELETE FROM movimento_estoque WHERE documento = $1`,
      values: [docTag],
    });
    await client.query({
      text: `DELETE FROM pedido_itens WHERE pedido_id = $1`,
      values: [id],
    });
    await client.query({
      text: `DELETE FROM pedidos WHERE id = $1`,
      values: [id],
    });
    await client.query("COMMIT");
    return res.status(200).json({ ok: true });
  } catch (e) {
    await database.safeRollback(client);
    console.error("DELETE /pedidos/:id error", e);
    if (isRelationMissing(e))
      return res.status(503).json({
        error: "Schema not migrated",
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

// removed duplicate helpers (now defined above)
