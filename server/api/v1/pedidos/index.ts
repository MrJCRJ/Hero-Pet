// pages/api/v1/pedidos/index.ts
import database from "infra/database";
import { isConnectionError, isRelationMissing } from "lib/errors";
import { listPedidos } from "./handlers/listPedidos";
import { processarItensVenda } from "lib/pedidos/fifo";
import { registrarMovimentosVenda } from "lib/domain/pedidos/registrarMovimentosVenda";
import {
  computeNewAverageCost,
  lockProdutoEstoque,
  registerSimplifiedMovement,
  isSimplifiedStockEnabled,
} from "lib/stock/simplified";
import {
  quantidadeUnidadesParaKgEstoque,
  valorUnitarioUnidadeParaCustoKg,
} from "lib/domain/produtos/simplifiedStockConversions";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

function parseDateYMD(ymd: unknown): string | null {
  if (
    !ymd ||
    typeof ymd !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(ymd)
  )
    return null;
  return ymd;
}

function formatDateYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalMidnight(
  input: string | Date | null | undefined
): Date {
  if (!input) return new Date();
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return new Date(
      input.getFullYear(),
      input.getMonth(),
      input.getDate()
    );
  }
  return new Date();
}

export default async function handler(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  if (req.method === "POST") return postPedido(req, res);
  if (req.method === "GET") return listPedidos(req, res);
  res.status(405).json({ error: `Method "${req.method}" not allowed` });
}

async function postPedido(
  req: ApiReqLike,
  res: ApiResLike
): Promise<void> {
  const client = await database.getClient();
  try {
    const b = (req.body || {}) as Record<string, unknown>;
    const tipo = b.tipo as string;
    if (!["VENDA", "COMPRA"].includes(tipo)) {
      res.status(400).json({ error: "tipo inválido" });
      return;
    }

    const partnerIdRaw = b.partner_entity_id;
    if (partnerIdRaw == null) {
      res.status(400).json({ error: "partner_entity_id obrigatório" });
      return;
    }
    const partnerId = Number(partnerIdRaw);
    if (!Number.isFinite(partnerId)) {
      res.status(400).json({ error: "partner_entity_id inválido" });
      return;
    }
    const r = await client.query({
      text: `SELECT id, ativo FROM entities WHERE id = $1`,
      values: [partnerId],
    });
    if (!r.rows.length) {
      res.status(400).json({ error: "Entidade não encontrada" });
      return;
    }
    if ((r.rows[0] as Record<string, unknown>).ativo === false) {
      res.status(400).json({ error: "Entidade inativa" });
      return;
    }

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
    const pedido = head.rows[0] as Record<string, unknown>;
    const itensInput = (Array.isArray(b.itens) ? b.itens : []) as Array<
      Record<string, unknown>
    >;
    let consumosPorItem: unknown[] = [];
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
        itens: itensInput as any,
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
            : Number((rProd.rows[0] as Record<string, unknown>).preco_tabela ?? 0);
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

    const numeroPromissorias = Number(b.numero_promissorias) || 1;
    const baseParcelamento =
      totalLiquido + (freteTotal > 0 ? freteTotal : 0);
    if (numeroPromissorias >= 1 && baseParcelamento > 0) {
      const valorPorPromissoria = baseParcelamento / numeroPromissorias;
      await client.query({
        text: `UPDATE pedidos SET valor_por_promissoria = $1 WHERE id = $2`,
        values: [valorPorPromissoria, pedido.id],
      });
    }

    if (
      numeroPromissorias >= 1 &&
      totalLiquido + (freteTotal > 0 ? freteTotal : 0) > 0
    ) {
      const amount = Number((baseParcelamento / numeroPromissorias).toFixed(2));
      const datas = Array.isArray(b.promissoria_datas)
        ? (b.promissoria_datas as string[]).filter((s) =>
            /^(\d{4})-(\d{2})-(\d{2})$/.test(String(s))
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
        const firstDate = b.data_primeira_promissoria
          ? parseDateYMD(b.data_primeira_promissoria)
          : null;
        const baseDate = toLocalMidnight(firstDate || new Date());
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

    const docTag = `PEDIDO:${pedido.id}`;
    const itensCriados = await client.query({
      text: `SELECT * FROM pedido_itens WHERE pedido_id = $1 ORDER BY id`,
      values: [pedido.id],
    });
    const freteTotalNumber = Number(b.frete_total || 0);
    const sumQtdCompra = (
      itensCriados.rows as Array<Record<string, unknown>>
    ).reduce((acc, it) => acc + Number(it.quantidade), 0);

    if (tipo === "VENDA") {
      await registrarMovimentosVenda({
        client,
        pedidoId: Number(pedido.id),
        itens: itensCriados.rows as Array<Record<string, unknown>>,
        consumosPorItem: consumosPorItem as Array<{
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
        }>,
        dataMovimento: dataEmissaoStr,
      });
    } else if (tipo === "COMPRA") {
      for (const it of itensCriados.rows as Array<Record<string, unknown>>) {
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
        if (isSimplifiedStockEnabled()) {
          const produto = await lockProdutoEstoque(client as any, Number(it.produto_id));
          const meta = {
            nome: produto.nome,
            venda_granel: produto.vendaGranel,
          };
          const qtdKg = quantidadeUnidadesParaKgEstoque(qtd, meta);
          const custoKg = valorUnitarioUnidadeParaCustoKg(valorUnit, meta);
          const novoCusto = computeNewAverageCost({
            estoqueAtualKg: produto.estoqueKg,
            custoMedioAtualKg: produto.custoMedioKg,
            quantidadeEntradaKg: qtdKg,
            custoEntradaKg: custoKg,
          });
          await client.query({
            text: `UPDATE produtos
                   SET estoque_kg = estoque_kg + $1, custo_medio_kg = $2, updated_at = NOW()
                   WHERE id = $3`,
            values: [qtdKg, novoCusto, it.produto_id],
          });
          await registerSimplifiedMovement(client as any, {
            produtoId: Number(it.produto_id),
            tipo: "entrada",
            quantidadeKg: qtdKg,
            precoUnitarioKg: custoKg,
            observacao: `Compra pedido ${pedido.id}`,
            refPedidoId: Number(pedido.id),
          });
          await client.query({
            text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, origem_tipo, data_movimento)
                   VALUES ($1,'ENTRADA',$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10::timestamptz, NOW()))`,
            values: [
              it.produto_id,
              qtd,
              valorUnit,
              share > 0 ? share : 0,
              0,
              valorTotal,
              docTag,
              `ENTRADA por criação de pedido ${pedido.id}`,
              "PEDIDO",
              dataEmissaoStr,
            ],
          });
        } else {
          const movEnt = await client.query({
            text: `INSERT INTO movimento_estoque (produto_id, tipo, quantidade, valor_unitario, frete, outras_despesas, valor_total, documento, observacao, origem_tipo, data_movimento)
                   VALUES ($1,'ENTRADA',$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10::timestamptz, NOW()))
                   RETURNING id`,
            values: [
              it.produto_id,
              qtd,
              valorUnit,
              share > 0 ? share : 0,
              0,
              valorTotal,
              docTag,
              `ENTRADA por criação de pedido ${pedido.id}`,
              "PEDIDO",
              dataEmissaoStr,
            ],
          });
          const movRows = movEnt.rows as Array<{ id: number }>;
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
              movRows[0].id,
              dataEmissaoStr,
              docTag,
              `LOTE gerado por pedido ${pedido.id}`,
            ],
          });
        }
      }
    }

    const finalHead = await client.query({
      text: `SELECT * FROM pedidos WHERE id = $1`,
      values: [pedido.id],
    });

    await client.query("COMMIT");
    res.status(201).json(finalHead.rows[0]);
  } catch (e) {
    await database.safeRollback(client);
    console.error("POST /pedidos error", e);
    const err = e as { code?: string; message?: string };
    if (isRelationMissing(e)) {
      res.status(503).json({
        error: "Schema not migrated (pedidos|pedido_itens missing)",
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

