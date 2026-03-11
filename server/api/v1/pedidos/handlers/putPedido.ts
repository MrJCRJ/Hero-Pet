import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import { aplicarConsumosFIFO } from "lib/fifo";
import { processarItensVenda } from "lib/pedidos/fifo";
import { parseDateYMD, toLocalMidnight, fmtYMD } from "./utils";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export async function putPedido(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  const client = await database.getClient();
  try {
    const id = Number(req.query?.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "invalid id" });
      return;
    }
    const head = await client.query({
      text: `SELECT * FROM pedidos WHERE id = $1`,
      values: [id],
    });
    if (!head.rows.length) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const b = (req.body || {}) as Record<string, unknown>;
    await client.query("BEGIN");

    const sets: string[] = [];
    const values: unknown[] = [];
    const set = (field: string, value: unknown) => {
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
        parseDateYMD(b.data_primeira_promissoria) || null
      );
    if (b.frete_total !== undefined) {
      const ftNum = Number(b.frete_total);
      if (!Number.isNaN(ftNum) && ftNum > 0) {
        set("frete_total", ftNum);
      } else {
        set("frete_total", null);
      }
    }

    let tipoAtual = (head.rows[0] as Record<string, unknown>).tipo as string;
    if (b.tipo !== undefined) {
      if (!["VENDA", "COMPRA"].includes(b.tipo as string))
        throw new Error("tipo inválido");
      tipoAtual = b.tipo as string;
      set("tipo", b.tipo);
    }
    if (b.partner_entity_id !== undefined) {
      const pid = Number(b.partner_entity_id);
      if (!Number.isFinite(pid)) throw new Error("partner_entity_id inválido");
      const ent = await client.query({
        text: `SELECT ativo FROM entities WHERE id = $1`,
        values: [pid],
      });
      if (!ent.rows.length) throw new Error("Entidade não encontrada");
      if ((ent.rows[0] as Record<string, unknown>).ativo === false)
        throw new Error("Entidade inativa");
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
    const migrarFifo = b.migrar_fifo === true || b.migrar_fifo === "true";
    if (Array.isArray(b.itens) || migrarFifo) {
      let itensPayload: Array<Record<string, unknown>> | null = Array.isArray(
        b.itens
      )
        ? (b.itens as Array<Record<string, unknown>>)
        : null;
      if (!itensPayload) {
        const itensExistentes = await client.query({
          text: `SELECT produto_id, quantidade, preco_unitario AS preco_unitario, desconto_unitario AS desconto_unitario
                 FROM pedido_itens WHERE pedido_id = $1 ORDER BY id`,
          values: [id],
        });
        itensPayload = (
          itensExistentes.rows as Array<Record<string, unknown>>
        ).map((r) => ({
          produto_id: r.produto_id,
          quantidade: Number(r.quantidade),
          preco_unitario:
            r.preco_unitario != null ? Number(r.preco_unitario) : null,
          desconto_unitario:
            r.desconto_unitario != null ? Number(r.desconto_unitario) : null,
        }));
      }

      if ((head.rows[0] as Record<string, unknown>).tipo === "VENDA") {
        const movs = await client.query({
          text: `SELECT id FROM movimento_estoque WHERE documento = $1 AND tipo='SAIDA'`,
          values: [docTag],
        });
        for (const m of movs.rows as Array<{ id: number }>) {
          const consumos = await client.query({
            text: `SELECT lote_id, quantidade_consumida FROM movimento_consumo_lote WHERE movimento_id=$1`,
            values: [m.id],
          });
          for (const c of consumos.rows as Array<{
            lote_id: number;
            quantidade_consumida: number;
          }>) {
            await client.query({
              text: `UPDATE estoque_lote SET quantidade_disponivel = quantidade_disponivel + $1 WHERE id=$2`,
              values: [c.quantidade_consumida, c.lote_id],
            });
          }
        }
      }

      if ((head.rows[0] as Record<string, unknown>).tipo === "COMPRA") {
        const movsEntrada = await client.query({
          text: `SELECT id FROM movimento_estoque WHERE documento = $1 AND tipo='ENTRADA'`,
          values: [docTag],
        });
        for (const m of movsEntrada.rows as Array<{ id: number }>) {
          const lotes = await client.query({
            text: `SELECT id, quantidade_inicial, quantidade_disponivel FROM estoque_lote WHERE origem_movimento_id = $1`,
            values: [m.id],
          });
          for (const l of lotes.rows as Array<Record<string, unknown>>) {
            if (
              Number(l.quantidade_disponivel) < Number(l.quantidade_inicial)
            ) {
              throw new Error(
                "Não é possível editar itens: já existem consumos de estoque desta compra"
              );
            }
          }
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
      await client.query({
        text: `DELETE FROM pedido_itens WHERE pedido_id = $1`,
        values: [id],
      });

      let totalBruto = 0,
        descontoTotal = 0,
        totalLiquido = 0;
      const itensForRateio: Array<{
        produto_id: number;
        quantidade: number;
        preco_unitario: number;
        base: number;
      }> = [];
      const freteTotal = b.frete_total != null ? Number(b.frete_total) : 0;
      let consumosPorItem: unknown[] = [];

      if (tipoAtual === "VENDA") {
        const { itens: itensVenda, consumosPorItem: cps, totais } =
          await processarItensVenda({
            client,
            itens: itensPayload as any,
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
              : Number((rProd.rows[0] as Record<string, unknown>).preco_tabela ?? 0);
          const desconto =
            it.desconto_unitario != null
              ? Number(it.desconto_unitario)
              : 0;
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
            produto_id: it.produto_id as number,
            quantidade: qtd,
            preco_unitario: preco,
            base: preco * qtd,
          });
        }
      }

      if (tipoAtual === "VENDA") {
        const itensInseridos = await client.query({
          text: `SELECT * FROM pedido_itens WHERE pedido_id=$1 ORDER BY id`,
          values: [id],
        });
        for (const it of itensInseridos.rows as Array<Record<string, unknown>>) {
          const registroConsumo = (consumosPorItem as Array<{
            produto_id: number;
            legacy?: boolean;
            consumo?: {
              custo_unitario_medio: number;
              custo_total: number;
              consumos: Array<{
                lote_id: number;
                quantidade: number;
                custo_unitario: number;
                custo_total: number;
              }>;
            };
          }>).find((c) => c.produto_id === it.produto_id);
          if (!registroConsumo) continue;
          if (registroConsumo.legacy) {
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
                consumo!.custo_unitario_medio,
                consumo!.custo_total,
              ],
            });
            const movRows = mov.rows as Array<{ id: number }>;
            await aplicarConsumosFIFO({
              client,
              movimentoId: movRows[0].id,
              consumos: consumo!.consumos.map((c) => ({
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

      const pedidoAtualizado = await client.query({
        text: `SELECT numero_promissorias FROM pedidos WHERE id = $1`,
        values: [id],
      });
      const numeroPromissorias =
        Number(
          (pedidoAtualizado.rows[0] as Record<string, unknown>)
            ?.numero_promissorias
        ) || 1;
      if (numeroPromissorias >= 1 && totalLiquido + freteTotal > 0) {
        const valorPorPromissoria =
          (totalLiquido + freteTotal) / numeroPromissorias;
        await client.query({
          text: `UPDATE pedidos SET valor_por_promissoria = $1 WHERE id = $2`,
          values: [valorPorPromissoria, id],
        });
      }
    }

    try {
      const headNow = await client.query({
        text: `SELECT total_liquido, numero_promissorias, data_primeira_promissoria FROM pedidos WHERE id = $1`,
        values: [id],
      });
      if (headNow.rows.length) {
        const row = headNow.rows[0] as Record<string, unknown>;
        const tl = Number(row.total_liquido || 0);
        const freteQ = await client.query({
          text: `SELECT frete_total FROM pedidos WHERE id = $1`,
          values: [id],
        });
        const ft = Number(
          (freteQ.rows[0] as Record<string, unknown>)?.frete_total || 0
        );
        const np = Number(row.numero_promissorias || 1);
        const firstDate = row.data_primeira_promissoria;
        const baseParcelamento = tl + ft;
        if (np >= 1 && baseParcelamento > 0) {
          const vpp = baseParcelamento / np;
          await client.query({
            text: `UPDATE pedidos SET valor_por_promissoria = $1 WHERE id = $2`,
            values: [vpp, id],
          });

          const anyPaid = await client.query({
            text: `SELECT 1 FROM pedido_promissorias WHERE pedido_id = $1 AND paid_at IS NOT NULL LIMIT 1`,
            values: [id],
          });
          if (!anyPaid.rows.length) {
            await client.query({
              text: `DELETE FROM pedido_promissorias WHERE pedido_id = $1`,
              values: [id],
            });
            const amt = Number(vpp.toFixed(2));
            const datas = Array.isArray(b.promissoria_datas)
              ? (b.promissoria_datas as string[]).filter((s) =>
                  /^(\d{4})-(\d{2})-(\d{2})$/.test(String(s))
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
              const norm = toLocalMidnight(
                (firstDate as string | Date) || new Date()
              );
              for (let i = 0; i < np; i++) {
                const due = new Date(norm);
                due.setMonth(due.getMonth() + i);
                await client.query({
                  text: `INSERT INTO pedido_promissorias (pedido_id, seq, due_date, amount) VALUES ($1,$2,$3,$4)`,
                  values: [id, i + 1, fmtYMD(due), amt],
                });
              }
            }
          } else if (
            b.frete_total !== undefined &&
            tipoAtual === "COMPRA"
          ) {
            await client.query({
              text: `DELETE FROM movimento_estoque WHERE documento = $1`,
              values: [docTag],
            });
            const itensAtuais = await client.query({
              text: `SELECT produto_id, quantidade, preco_unitario FROM pedido_itens WHERE pedido_id = $1 ORDER BY id`,
              values: [id],
            });
            const rows = (itensAtuais.rows || []) as Array<
              Record<string, unknown>
            >;
            const sumQtd = rows.reduce(
              (acc, it) => acc + Number(it.quantidade),
              0
            );
            const freteTotalVal = Number(b.frete_total || 0);
            for (const it of rows) {
              const base =
                Number(it.preco_unitario) * Number(it.quantidade);
              const shareRaw =
                freteTotalVal > 0 && sumQtd > 0
                  ? (freteTotalVal * Number(it.quantidade)) / sumQtd
                  : 0;
              const share = Number(shareRaw.toFixed(2));
              const valorTotal = Number(
                (base + share).toFixed(2)
              );
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
    } catch {
      /* não falhar PUT por erro na recomputação */
    }

    await client.query("COMMIT");
    res.status(200).json({ ok: true });
  } catch (e) {
    await database.safeRollback(client);
    console.error("PUT /pedidos/:id error", e);
    const err = e as { code?: string; message?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (pedidos/pedido_itens missing)",
        dependency: "database",
        code: err.code,
        action: "Run migrations",
      });
      return;
    }
    if (isConnectionError(e)) {
      res.status(503).json({
        error: "Database unreachable",
        dependency: "database",
        code: err.code,
      });
      return;
    }
    res.status(400).json({ error: err.message || "Invalid payload" });
  } finally {
    try {
      client.release();
    } catch {
      /* noop */
    }
  }
}
