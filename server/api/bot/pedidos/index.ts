import database from "infra/database";
import { processarItensVenda } from "lib/pedidos/fifo";
import { registrarMovimentosVenda } from "lib/domain/pedidos/registrarMovimentosVenda";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { BotPedidoSchema, BotPedidosQuerySchema } from "@/server/api/bot/schemas";
import { sanitizeForBotLogs } from "@/server/api/bot/logging";
import { lockProdutoEstoque, registerSimplifiedMovement, isSimplifiedStockEnabled } from "lib/stock/simplified";

function parseAddressInfo(observacao: unknown): Record<string, unknown> | null {
  if (typeof observacao !== "string" || !observacao.startsWith("BOT_ADDR::")) return null;
  try {
    return JSON.parse(observacao.slice("BOT_ADDR::".length)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseDeliveryWindow(): { start: number; end: number } {
  const explicitStart = process.env.DELIVERY_START_TIME;
  const explicitEnd = process.env.DELIVERY_END_TIME;
  const fallback = "08:00-18:00";
  const raw = explicitStart && explicitEnd ? `${explicitStart}-${explicitEnd}` : process.env.BOT_DELIVERY_WINDOW || fallback;
  const match = raw.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
  if (!match) return { start: 8 * 60, end: 18 * 60 };
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  return { start, end };
}

function allowedBairros(): string[] {
  return String(process.env.ALLOWED_BAIRROS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseHHMM(value: string): number | null {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  if (req.method === "GET") {
    const parsedGet = BotPedidosQuerySchema.safeParse(req.query ?? {});
    if (!parsedGet.success) {
      res.status(400).json({ error: parsedGet.error.issues[0]?.message ?? "Invalid query" });
      return;
    }
    const filters: string[] = ["p.tipo = 'VENDA'"];
    const values: unknown[] = [];
    if (parsedGet.data.status) {
      values.push(parsedGet.data.status);
      filters.push(`p.status = $${values.length}`);
    }
    if (parsedGet.data.cliente_id) {
      values.push(parsedGet.data.cliente_id);
      filters.push(`p.partner_entity_id = $${values.length}`);
    }
    if (parsedGet.data.data_inicio) {
      values.push(parsedGet.data.data_inicio);
      filters.push(`p.data_emissao::date >= $${values.length}::date`);
    }
    if (parsedGet.data.data_fim) {
      values.push(parsedGet.data.data_fim);
      filters.push(`p.data_emissao::date <= $${values.length}::date`);
    }
    try {
      const rows = await database.query({
        text: `SELECT p.id, p.status, p.data_emissao, p.total_liquido, p.partner_entity_id, p.partner_name,
                      pi.produto_id, pi.quantidade, pi.preco_unitario, pr.nome AS produto_nome
               FROM pedidos p
               LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
               LEFT JOIN produtos pr ON pr.id = pi.produto_id
               WHERE ${filters.join(" AND ")}
               ORDER BY p.data_emissao DESC, p.id DESC, pi.id ASC
               LIMIT 500`,
        values,
      });
      const grouped = new Map<number, {
        id: number;
        status: string;
        data: string;
        cliente_id: number | null;
        cliente_nome: string;
        total: number;
        itens: Array<{ produto_id: number; produto_nome: string; quantidade_kg: number; preco_unitario_kg: number }>;
      }>();
      for (const r of rows.rows as Array<Record<string, unknown>>) {
        const id = Number(r.id);
        if (!grouped.has(id)) {
          grouped.set(id, {
            id,
            status: String(r.status ?? ""),
            data: String(r.data_emissao ?? ""),
            cliente_id: r.partner_entity_id == null ? null : Number(r.partner_entity_id),
            cliente_nome: String(r.partner_name ?? ""),
            total: Number(r.total_liquido ?? 0),
            itens: [],
          });
        }
        if (r.produto_id != null) {
          grouped.get(id)?.itens.push({
            produto_id: Number(r.produto_id),
            produto_nome: String(r.produto_nome ?? ""),
            quantidade_kg: Number(r.quantidade ?? 0),
            preco_unitario_kg: Number(r.preco_unitario ?? 0),
          });
        }
      }
      res.status(200).json([...grouped.values()]);
      return;
    } catch (error) {
      console.error("[bot/pedidos:get] error", error);
      res.status(500).json({ error: "Internal error" });
      return;
    }
  }

  const parsed = BotPedidoSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }

  const payload = parsed.data;
  console.info(
    "[bot/pedidos] payload",
    sanitizeForBotLogs({
      cliente_id: payload.cliente_id,
      itens: payload.itens.length,
      forma_pagamento: payload.forma_pagamento,
    })
  );

  const window = parseDeliveryWindow();
  if (payload.horario_entrega) {
    const minute = parseHHMM(payload.horario_entrega);
    if (minute == null || minute < window.start || minute > window.end) {
      res.status(422).json({ error: "Horario de entrega fora da janela permitida" });
      return;
    }
  }

  const client = await database.getClient();
  try {
    const partner = await client.query({
      text: `SELECT id, name, telefone, cep, numero, observacao, ativo
                    , COALESCE(tipo_cliente, 'pessoa_juridica') AS tipo_cliente
             FROM entities WHERE id = $1 AND entity_type = 'PF'`,
      values: [payload.cliente_id],
    });

    if (!partner.rows.length || (partner.rows[0] as Record<string, unknown>).ativo === false) {
      res.status(404).json({ error: "Cliente nao encontrado" });
      return;
    }
    if (String((partner.rows[0] as Record<string, unknown>).tipo_cliente ?? "") !== "pessoa_fisica") {
      res.status(400).json({ error: "Cliente precisa ser pessoa_fisica" });
      return;
    }

    const entity = partner.rows[0] as Record<string, unknown>;
    if (payload.endereco_id && payload.endereco_id !== payload.cliente_id) {
      res.status(422).json({ error: "Endereco nao pertence ao cliente" });
      return;
    }

    const addressInfo = parseAddressInfo(entity.observacao);
    if (!addressInfo) {
      res.status(422).json({ error: "Cliente sem endereco cadastrado" });
      return;
    }
    const bairroAddress = String(addressInfo.bairro ?? "")
      .trim()
      .toLowerCase();
    const bairrosPermitidos = allowedBairros();
    if (bairrosPermitidos.length && !bairrosPermitidos.includes(bairroAddress)) {
      res.status(400).json({ error: "Bairro nao permitido" });
      return;
    }

    await client.query("BEGIN");
    if (!isSimplifiedStockEnabled()) {
      for (const item of payload.itens) {
        await client.query({
          text: `SELECT id FROM estoque_lote
                 WHERE produto_id = $1 AND quantidade_disponivel > 0
                 ORDER BY data_entrada ASC, id ASC
                 FOR UPDATE`,
          values: [item.produto_id],
        });
      }
    }
    const head = await client.query({
      text: `INSERT INTO pedidos
             (tipo, status, partner_entity_id, partner_name, data_emissao, observacao, tem_nota_fiscal, parcelado, numero_promissorias)
             VALUES ('VENDA', 'confirmado', $1, $2, NOW(), $3, false, false, 1)
             RETURNING id`,
      values: [
        payload.cliente_id,
        String(entity.name ?? "Cliente WhatsApp"),
        JSON.stringify({
          origem: "BOT_WHATSAPP",
          endereco: addressInfo,
          forma_pagamento: payload.forma_pagamento,
          horario_entrega: payload.horario_entrega ?? null,
          observacoes: payload.observacoes ?? null,
        }),
      ],
    });
    const pedidoId = Number((head.rows[0] as Record<string, unknown>).id);

    const itensInput = payload.itens.map((item) => ({
      produto_id: item.produto_id,
      quantidade: item.quantidade_kg,
      preco_unitario: item.preco_unitario_kg,
    }));

    let itens: Array<Record<string, unknown>> = [];
    let consumosPorItem: Array<Record<string, unknown>> = [];
    let totais: { totalBruto: number; descontoTotal: number; totalLiquido: number } = {
      totalBruto: 0,
      descontoTotal: 0,
      totalLiquido: 0,
    };
    if (isSimplifiedStockEnabled()) {
      const sorted = [...payload.itens].sort((a, b) => a.produto_id - b.produto_id);
      for (const item of sorted) {
        const p = await client.query({
          text: `SELECT id, nome, COALESCE(venda_granel, false) AS venda_granel,
                        COALESCE(preco_kg_granel, preco_tabela, 0) AS preco_kg
                 FROM produtos
                 WHERE id = $1`,
          values: [item.produto_id],
        });
        if (!p.rows.length) throw new Error("produto_id inválido");
        const row = p.rows[0] as Record<string, unknown>;
        if (!Boolean(row.venda_granel)) throw new Error("Produto não vendido a granel");
        const estoque = await lockProdutoEstoque(client as any, item.produto_id);
        if (estoque.estoqueKg < item.quantidade_kg) throw new Error("Saldo insuficiente");
        const precoKg = Number(row.preco_kg ?? 0);
        const totalItem = Number((precoKg * item.quantidade_kg).toFixed(2));
        totais.totalBruto += totalItem;
        totais.totalLiquido += totalItem;
        await client.query({
          text: `UPDATE produtos
                 SET estoque_kg = estoque_kg - $1, updated_at = NOW()
                 WHERE id = $2`,
          values: [item.quantidade_kg, item.produto_id],
        });
        await registerSimplifiedMovement(client as any, {
          produtoId: item.produto_id,
          tipo: "saida",
          quantidadeKg: item.quantidade_kg,
          precoUnitarioKg: estoque.custoMedioKg,
          observacao: `Pedido bot ${payload.cliente_id}`,
        });
        itens.push({
          produto_id: item.produto_id,
          quantidade: item.quantidade_kg,
          preco: precoKg,
          desconto: 0,
          total_item: totalItem,
          custo_unit_venda: estoque.custoMedioKg,
          custo_total_item: Number((estoque.custoMedioKg * item.quantidade_kg).toFixed(2)),
        });
        consumosPorItem.push({
          produto_id: item.produto_id,
          simplified: true,
        });
      }
    } else {
      const processed = await processarItensVenda({
        client,
        itens: itensInput,
        dataEmissao: null,
      });
      itens = processed.itens;
      consumosPorItem = processed.consumosPorItem;
      totais = processed.totais;
    }

    for (const it of itens) {
      await client.query({
        text: `INSERT INTO pedido_itens
               (pedido_id, produto_id, quantidade, preco_unitario, desconto_unitario, total_item, custo_unit_venda, custo_total_item)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        values: [
          pedidoId,
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

    await client.query({
      text: `UPDATE pedidos
             SET total_bruto = $1, desconto_total = $2, total_liquido = $3, updated_at = NOW()
             WHERE id = $4`,
      values: [totais.totalBruto, totais.descontoTotal, totais.totalLiquido, pedidoId],
    });

    if (!isSimplifiedStockEnabled()) {
      await registrarMovimentosVenda({
        client,
        pedidoId,
        itens: itens as Array<Record<string, unknown>>,
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
      });
    }

    await client.query("COMMIT");
    res.status(201).json({
      id: pedidoId,
      status: "confirmado",
      total: totais.totalLiquido,
      total_liquido: totais.totalLiquido,
    });
  } catch (error) {
    await database.safeRollback(client);
    const message = (error as { message?: string }).message ?? "";
    if (message.toLowerCase().includes("saldo insuficiente")) {
      res.status(422).json({ error: "Estoque insuficiente" });
      return;
    }
    if (message.toLowerCase().includes("produto_id")) {
      res.status(404).json({ error: "Produto nao encontrado" });
      return;
    }
    console.error("[bot/pedidos] error", error);
    res.status(500).json({ error: "Internal error" });
  } finally {
    try {
      client.release();
    } catch {
      /* noop */
    }
  }
}
