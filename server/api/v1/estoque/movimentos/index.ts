// pages/api/v1/estoque/movimentos/index.ts
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import { consumirFIFO, aplicarConsumosFIFO } from "lib/fifo";
import {
  computeNewAverageCost,
  lockProdutoEstoque,
  registerSimplifiedMovement,
  isDualWriteStockEnabled,
  isSimplifiedStockEnabled,
} from "lib/stock/simplified";
import {
  quantidadeUnidadesParaKgEstoque,
  valorUnitarioUnidadeParaCustoKg,
} from "lib/domain/produtos/simplifiedStockConversions";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { listMovimentos } from "./handlers/listMovimentos";

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method === "GET") return listMovimentos(req, res);
  if (req.method !== "POST") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }
  try {
    const b = (req.body || {}) as Record<string, unknown>;
    const produtoId = b.produto_id;
    const tipo = b.tipo;
    const quantidade = Number(b.quantidade);
    if (!produtoId) {
      res.status(400).json({ error: "produto_id is required" });
      return;
    }
    if (!["ENTRADA", "SAIDA", "AJUSTE"].includes(tipo as string)) {
      res.status(400).json({ error: "tipo inválido" });
      return;
    }
    if (!Number.isFinite(quantidade) || quantidade === 0) {
      res.status(400).json({ error: "quantidade inválida" });
      return;
    }
    if (tipo === "SAIDA" && quantidade < 0) {
      res.status(400).json({
        error: "quantidade de saída deve ser positiva",
      });
      return;
    }

    let valor_unitario =
      b.valor_unitario != null ? Number(b.valor_unitario) : null;
    let frete = b.frete != null ? Number(b.frete) : 0;
    let outras = b.outras_despesas != null ? Number(b.outras_despesas) : 0;
    if (tipo === "ENTRADA") {
      if (
        valor_unitario == null ||
        !Number.isFinite(valor_unitario) ||
        valor_unitario < 0
      ) {
        res.status(400).json({ error: "valor_unitario inválido" });
        return;
      }
    } else {
      valor_unitario = null;
      frete = 0;
      outras = 0;
    }

    let valor_total: number | null = null;
    if (tipo === "ENTRADA") {
      valor_total =
        quantidade * Number(b.valor_unitario || 0) + frete + outras;
    }

    if (isSimplifiedStockEnabled()) {
      let client:
        | {
            query: (arg: string | Record<string, unknown>) => Promise<unknown>;
            release: () => void;
          }
        | undefined;
      try {
        const c = await database.getClient();
        client = c;
        await c.query("BEGIN");
        const produto = await lockProdutoEstoque(c as any, Number(produtoId));
        const meta = {
          nome: produto.nome,
          venda_granel: produto.vendaGranel,
        };
        const qtdKgEntradaSaida = quantidadeUnidadesParaKgEstoque(quantidade, meta);
        const deltaKg =
          tipo === "ENTRADA"
            ? qtdKgEntradaSaida
            : tipo === "SAIDA"
              ? -qtdKgEntradaSaida
              : Math.sign(quantidade) *
                quantidadeUnidadesParaKgEstoque(Math.abs(quantidade), meta);
        if (tipo === "SAIDA" && produto.estoqueKg < qtdKgEntradaSaida) {
          await c.query("ROLLBACK");
          c.release();
          res.status(400).json({ error: "Estoque insuficiente" });
          return;
        }
        if (tipo === "AJUSTE" && produto.estoqueKg + deltaKg < 0) {
          await c.query("ROLLBACK");
          c.release();
          res.status(400).json({ error: "Ajuste negativo excederia o saldo disponível" });
          return;
        }

        const novoEstoque = produto.estoqueKg + deltaKg;
        const custoEntrada =
          tipo === "ENTRADA"
            ? valorUnitarioUnidadeParaCustoKg(Number(valor_unitario ?? 0), meta)
            : produto.custoMedioKg;
        const novoCusto =
          tipo === "ENTRADA"
            ? computeNewAverageCost({
                estoqueAtualKg: produto.estoqueKg,
                custoMedioAtualKg: produto.custoMedioKg,
                quantidadeEntradaKg: qtdKgEntradaSaida,
                custoEntradaKg: custoEntrada,
              })
            : produto.custoMedioKg;

        await c.query({
          text: `UPDATE produtos
                 SET estoque_kg = $1, custo_medio_kg = $2, updated_at = NOW()
                 WHERE id = $3`,
          values: [novoEstoque, novoCusto, produtoId],
        });

        const regTipo: "entrada" | "saida" =
          tipo === "ENTRADA"
            ? "entrada"
            : tipo === "SAIDA"
              ? "saida"
              : deltaKg >= 0
                ? "entrada"
                : "saida";
        const regQtdKg =
          tipo === "AJUSTE" ? Math.abs(deltaKg) : Math.abs(qtdKgEntradaSaida);
        await registerSimplifiedMovement(c as any, {
          produtoId: Number(produtoId),
          tipo: regTipo,
          quantidadeKg: regQtdKg,
          precoUnitarioKg:
            tipo === "ENTRADA" ? custoEntrada : produto.custoMedioKg,
          observacao: String(b.observacao || `Movimento ${tipo}`),
        });

        if (isDualWriteStockEnabled()) {
          const legacyCostUnit =
            tipo === "SAIDA" || (tipo === "AJUSTE" && deltaKg < 0)
              ? produto.custoMedioKg
              : null;
          const kgSaidaLegacy =
            tipo === "SAIDA"
              ? qtdKgEntradaSaida
              : tipo === "AJUSTE" && deltaKg < 0
                ? Math.abs(deltaKg)
                : 0;
          const legacyCostTotal =
            tipo === "SAIDA" || (tipo === "AJUSTE" && deltaKg < 0)
              ? Number((produto.custoMedioKg * kgSaidaLegacy).toFixed(2))
              : null;
          await c.query({
            text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, custo_unitario_rec, custo_total_rec)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            values: [
              produtoId,
              tipo,
              quantidade,
              valor_unitario,
              frete,
              outras,
              valor_total,
              b.documento || null,
              b.observacao || null,
              legacyCostUnit,
              legacyCostTotal,
            ],
          });
        }

        await c.query("COMMIT");
        c.release();
        res.status(201).json({
          produto_id: Number(produtoId),
          tipo,
          quantidade,
          estoque_kg: novoEstoque,
          custo_medio_kg: novoCusto,
        });
        return;
      } catch (err) {
        if (client) {
          try {
            await client.query("ROLLBACK");
          } catch {}
          try {
            client.release();
          } catch {}
        }
        throw err;
      }
    }

    const fifoEnv = String(process.env.FIFO_ENABLED || "").trim() === "1";
    const fifoHeader =
      String((req as unknown as { headers?: Record<string, string> }).headers?.["x-fifo-enabled"] || "").trim() ===
      "1";
    const fifoBody =
      b.fifo_enabled === true ||
      b.fifo_enabled === 1 ||
      b.fifo_enabled === "1";
    const fifoEnabled = fifoEnv || fifoHeader || fifoBody;

    if (fifoEnabled && tipo === "ENTRADA") {
      let client: { query: (arg: string | Record<string, unknown>) => Promise<unknown>; release: () => void } | undefined;
      try {
        const c = await database.getClient();
        client = c;
        await c.query("BEGIN");
        const insertMov = await c.query({
          text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, origem_tipo)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                 RETURNING id, produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, data_movimento`,
          values: [
            produtoId,
            tipo,
            quantidade,
            valor_unitario,
            frete,
            outras,
            valor_total,
            b.documento || null,
            b.observacao || null,
            "ENTRADA",
          ],
        }) as { rows: Array<Record<string, unknown>> };
        const mov = insertMov.rows[0];
        const custoUnitarioLote = quantidade > 0 ? valor_total! / quantidade : 0;
        await c.query({
          text: `INSERT INTO estoque_lote (produto_id, quantidade_inicial, quantidade_disponivel, custo_unitario, valor_total, origem_tipo, origem_movimento_id, documento, observacao)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          values: [
            produtoId,
            quantidade,
            quantidade,
            custoUnitarioLote,
            valor_total,
            "ENTRADA",
            mov.id,
            b.documento || null,
            b.observacao || null,
          ],
        });
        await c.query("COMMIT");
        try {
          c.release();
        } catch {
          /* noop */
        }
        res.status(201).json(mov);
        return;
      } catch (err) {
        if (err) console.error("FIFO ENTRADA error", err);
        if (client) {
          try {
            await client.query("ROLLBACK");
          } catch {
            /* noop */
          }
          try {
            client.release();
          } catch {
            /* noop */
          }
        }
        throw err;
      }
    }

    if (fifoEnabled && tipo === "SAIDA") {
      let client: {
        query: (arg: string | Record<string, unknown>) => Promise<unknown>;
        release: () => void;
      } | undefined;
      try {
        const c = await database.getClient();
        client = c;
        await c.query("BEGIN");
        let consumo: {
          custo_unitario_medio: number;
          custo_total: number;
          consumos: Array<{
            lote_id: number;
            quantidade: number;
            custo_unitario: number;
            custo_total: number;
          }>;
        };
        try {
          consumo = await consumirFIFO({
            client: c,
            produtoId: produtoId as number,
            quantidade,
          });
        } catch (err) {
          const e = err as { code?: string };
          if (e.code === "ESTOQUE_INSUFICIENTE") {
            await c.query("ROLLBACK");
            try {
              c.release();
            } catch {
              /* noop */
            }
            res.status(400).json({
              error: "Estoque insuficiente para SAIDA FIFO",
            });
            return;
          }
          throw err;
        }
        const insertMov = await c.query({
          text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, origem_tipo, custo_unitario_rec, custo_total_rec)
                 VALUES ($1,$2,$3,NULL,0,0,NULL,$4,$5,$6,$7,$8)
                 RETURNING id, produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, data_movimento, custo_unitario_rec, custo_total_rec`,
          values: [
            produtoId,
            tipo,
            quantidade,
            b.documento || null,
            b.observacao || null,
            "SAIDA",
            consumo.custo_unitario_medio,
            consumo.custo_total,
          ],
        }) as { rows: Array<{ id: number }> };
        const mov = insertMov.rows[0];
        await aplicarConsumosFIFO({
          client: c,
          movimentoId: mov.id,
          consumos: consumo.consumos.map((c) => ({
            lote_id: c.lote_id,
            quantidade: c.quantidade,
            custo_unitario: c.custo_unitario,
            custo_total: c.custo_total,
          })),
        });
        await c.query("COMMIT");
        try {
          c.release();
        } catch {
          /* noop */
        }
        res.status(201).json(insertMov.rows[0]);
        return;
      } catch (err) {
        if (client) {
          try {
            await client.query("ROLLBACK");
          } catch {
            /* noop */
          }
          try {
            client.release();
          } catch {
            /* noop */
          }
        }
        console.error("FIFO SAIDA error", err);
        throw err;
      }
    }

    let legacyCostUnit: number | null = null;
    let legacyCostTotal: number | null = null;
    if (tipo === "SAIDA") {
      const custoQ = await database.query({
        text: `SELECT COALESCE(SUM(valor_total)/NULLIF(SUM(quantidade),0),0) AS custo
               FROM movimento_estoque
               WHERE produto_id = $1 AND tipo = 'ENTRADA'`,
        values: [produtoId],
      });
      legacyCostUnit = Number(
        (custoQ.rows[0] as Record<string, unknown>)?.custo || 0
      );
      legacyCostTotal = Number((legacyCostUnit * quantidade).toFixed(2));
    }

    let client: {
      query: (arg: string | Record<string, unknown>) => Promise<unknown>;
      release: () => void;
    } | undefined;
    try {
      const c = await database.getClient();
      client = c;
      await c.query("BEGIN");

      await c.query({
        text: `SELECT 1 FROM produtos WHERE id = $1 FOR UPDATE`,
        values: [produtoId],
      });
      const saldoRow = await c.query({
        text: `SELECT COALESCE(SUM(CASE WHEN tipo='ENTRADA' THEN quantidade WHEN tipo='SAIDA' THEN -quantidade ELSE quantidade END),0)::numeric AS saldo
               FROM movimento_estoque
               WHERE produto_id = $1`,
        values: [produtoId],
      }) as { rows: Array<{ saldo: string }> };
      const saldo = Number(saldoRow.rows[0]?.saldo ?? 0);

      if (tipo === "SAIDA" && saldo < quantidade) {
        await c.query("ROLLBACK");
        try {
          c.release();
        } catch {
          /* noop */
        }
        res.status(400).json({ error: "Estoque insuficiente" });
        return;
      }
      if (tipo === "AJUSTE" && quantidade < 0 && saldo + quantidade < 0) {
        await c.query("ROLLBACK");
        try {
          c.release();
        } catch {
          /* noop */
        }
        res.status(400).json({ error: "Ajuste negativo excederia o saldo disponível" });
        return;
      }

      const insert = {
        text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, custo_unitario_rec, custo_total_rec)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               RETURNING id, produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, data_movimento, custo_unitario_rec, custo_total_rec`,
        values: [
          produtoId,
          tipo,
          quantidade,
          valor_unitario,
          frete,
          outras,
          valor_total,
          b.documento || null,
          b.observacao || null,
          legacyCostUnit,
          legacyCostTotal,
        ],
      };
      const r = await c.query(insert) as { rows: Array<Record<string, unknown>> };
      await c.query("COMMIT");
      try {
        c.release();
      } catch {
        /* noop */
      }
      res.status(201).json(r.rows[0]);
      return;
    } catch (err) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* noop */
        }
        try {
          client.release();
        } catch {
          /* noop */
        }
      }
      throw err;
    }
  } catch (e) {
    console.error("POST /estoque/movimentos error", e);
    const err = e as { code?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (movimento_estoque or produtos missing)",
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
