import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import { processarItensVenda } from "lib/pedidos/fifo";
import { aplicarConsumosFIFO } from "lib/fifo";

// POST /api/v1/pedidos/migrate_fifo_all
// Reprocessa pedidos VENDA legacy (fifo_aplicado=false) aplicando FIFO sem alterar valores de venda.
// Estratégia: buscar IDs em lote e para cada um reaproveitar lógica de PUT migrar_fifo (reimplementação simplificada aqui para evitar N requisições).
export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  const limitBatch = Math.min(Number(req.query.limit) || 50, 200); // evita explodir transação gigante
  try {
    // Seleciona IDs de pedidos legado
    // Seleciona pedidos considerados "legacy" para migração.
    // Critério atualizado: VENDA com SAIDAS e (alguma SAIDA sem custo reconhecido OU alguma SAIDA sem pivot de consumo_lote).
    // Isto alinha a seleção com a lógica de legacy_count e evita que pedidos antigos (que já receberam custo médio, mas não pivots) fiquem presos.
    const legacy = await database.query({
      text: `SELECT p.id
             FROM pedidos p
             WHERE p.tipo='VENDA'
               AND EXISTS (
                 SELECT 1 FROM movimento_estoque m
                  WHERE m.documento=('PEDIDO:'||p.id) AND m.tipo='SAIDA'
               )
               AND (
                 EXISTS (
                   SELECT 1 FROM movimento_estoque m
                    WHERE m.documento=('PEDIDO:'||p.id)
                      AND m.tipo='SAIDA'
                      AND (m.custo_total_rec IS NULL OR m.custo_total_rec=0)
                 )
                 OR EXISTS (
                   SELECT 1 FROM movimento_estoque m
                   LEFT JOIN movimento_consumo_lote mc ON mc.movimento_id = m.id
                    WHERE m.documento=('PEDIDO:'||p.id)
                      AND m.tipo='SAIDA'
                      AND mc.id IS NULL
                 )
               )
             ORDER BY p.id
             LIMIT $1`,
      values: [limitBatch],
    });
    if (!legacy.rows.length)
      return res
        .status(200)
        .json({ migrated: 0, message: "Nenhum pedido legacy para migrar." });

    let migrated = 0;
    for (const row of legacy.rows) {
      const client = await database.getClient();
      try {
        await client.query("BEGIN");
        const id = row.id;
        const head = await client.query({
          text: "SELECT * FROM pedidos WHERE id=$1 FOR UPDATE",
          values: [id],
        });
        if (!head.rows.length || head.rows[0].tipo !== "VENDA") {
          await client.query("ROLLBACK");
          continue;
        }
        const docTag = `PEDIDO:${id}`;
        // Carrega itens atuais
        const itensRaw = await client.query({
          text: `SELECT produto_id, quantidade, preco_unitario AS preco_unitario, desconto_unitario AS desconto_unitario
                 FROM pedido_itens WHERE pedido_id=$1 ORDER BY id`,
          values: [id],
        });
        const itensPayload = itensRaw.rows.map((r) => ({
          produto_id: r.produto_id,
          quantidade: Number(r.quantidade),
          preco_unitario:
            r.preco_unitario != null ? Number(r.preco_unitario) : null,
          desconto_unitario:
            r.desconto_unitario != null ? Number(r.desconto_unitario) : null,
        }));
        // Restaurar consumos FIFO anteriores (se houver inconsistências) - similar PUT
        const movs = await client.query({
          text: `SELECT id FROM movimento_estoque WHERE documento=$1 AND tipo='SAIDA'`,
          values: [docTag],
        });
        for (const m of movs.rows) {
          const consumos = await client.query({
            text: "SELECT lote_id, quantidade_consumida FROM movimento_consumo_lote WHERE movimento_id=$1",
            values: [m.id],
          });
          for (const c of consumos.rows) {
            await client.query({
              text: "UPDATE estoque_lote SET quantidade_disponivel = quantidade_disponivel + $1 WHERE id=$2",
              values: [c.quantidade_consumida, c.lote_id],
            });
          }
        }
        // Apaga movimentos SAIDA anteriores
        await client.query({
          text: "DELETE FROM movimento_estoque WHERE documento=$1 AND tipo='SAIDA'",
          values: [docTag],
        });
        // Backfill de lotes ausentes para produtos legados:
        for (const it of itensPayload) {
          // Verifica se já existem lotes para o produto
          const lotesExist = await client.query({
            text: "SELECT 1 FROM estoque_lote WHERE produto_id=$1 LIMIT 1",
            values: [it.produto_id],
          });
          if (!lotesExist.rows.length) {
            // Calcula saldo agregado e custo médio de todas as ENTRADAS
            const saldoECusto = await client.query({
              text: `SELECT 
                         COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN quantidade WHEN tipo='SAIDA' THEN -quantidade ELSE 0 END),0) AS saldo,
                         COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN valor_total ELSE 0 END) / NULLIF(SUM(CASE WHEN tipo='ENTRADA' THEN quantidade ELSE 0 END),0),0) AS custo_medio
                       FROM movimento_estoque WHERE produto_id=$1`,
              values: [it.produto_id],
            });
            const saldo = Number(saldoECusto.rows?.[0]?.saldo || 0);
            const custoMedio = Number(saldoECusto.rows?.[0]?.custo_medio || 0);
            if (saldo > 0 && custoMedio > 0) {
              // Determina data de entrada mais antiga para ordenação FIFO previsível
              const firstEntrada = await client.query({
                text: `SELECT MIN(data_movimento) AS first FROM movimento_estoque WHERE produto_id=$1 AND tipo='ENTRADA'`,
                values: [it.produto_id],
              });
              const dataEntrada = firstEntrada.rows?.[0]?.first || null;
              await client.query({
                text: `INSERT INTO estoque_lote (produto_id, quantidade_inicial, quantidade_disponivel, custo_unitario, valor_total, origem_tipo, origem_movimento_id, data_entrada, documento, observacao)
                         VALUES ($1,$2,$2,$3,$4,'BACKFILL',NULL, COALESCE($5::timestamptz, NOW()), $6, $7)`,
                values: [
                  it.produto_id,
                  saldo,
                  custoMedio,
                  Number((saldo * custoMedio).toFixed(4)),
                  dataEntrada,
                  "BACKFILL AUTO",
                  "Lote sintético criado para permitir migração FIFO de pedidos legados",
                ],
              });
            }
          }
        }

        // Reprocessa FIFO (agora possivelmente com lotes backfill criados)
        const { itens, consumosPorItem } = await processarItensVenda({
          client,
          itens: itensPayload,
          dataEmissao: null,
        });
        // Atualiza itens (já existem - mantemos) apenas se quisermos custos (não mexeremos para evitar side effects de totais)
        // Inserir novos movimentos SAIDA com custos reconhecidos
        for (const it of itens) {
          const registroConsumo = consumosPorItem.find(
            (c) => c.produto_id === it.produto_id,
          );
          if (!registroConsumo || registroConsumo.legacy) continue; // se ainda legacy, pula
          const { consumo } = registroConsumo;
          const mov = await client.query({
            text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, documento, observacao, origem_tipo, custo_unitario_rec, custo_total_rec)
                   VALUES ($1,'SAIDA',$2,$3,$4,$5,$6,$7) RETURNING id`,
            values: [
              it.produto_id,
              it.quantidade,
              docTag,
              "SAÍDA (MIGRA FIFO EM LOTE)",
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
        await client.query("COMMIT");
        migrated++;
      } catch (e) {
        console.error("migrate_fifo_all pedido", row.id, e.message);
        await database.safeRollback(client);
      } finally {
        try {
          await client.end();
        } catch (_) {
          /* ignore end error */
        }
      }
    }
    return res.status(200).json({
      migrated,
      remaining_hint: `Rode novamente para mais (limit=${limitBatch})`,
    });
  } catch (e) {
    console.error("POST /pedidos/migrate_fifo_all error", e);
    if (isRelationMissing(e))
      return res
        .status(503)
        .json({ error: "Schema not migrated", code: e.code });
    if (isConnectionError(e))
      return res
        .status(503)
        .json({ error: "Database unreachable", code: e.code });
    return res.status(500).json({ error: "Internal error" });
  }
}
