import database from "infra/database";
import { processarItensVenda } from "lib/pedidos/fifo";
import { registrarMovimentosVenda } from "lib/domain/pedidos/registrarMovimentosVenda";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { BotPedidoSchema } from "@/server/api/bot/schemas";
import { sanitizeForBotLogs } from "@/server/api/bot/logging";

function parseAddressInfo(observacao: unknown): Record<string, unknown> | null {
  if (typeof observacao !== "string" || !observacao.startsWith("BOT_ADDR::")) return null;
  try {
    return JSON.parse(observacao.slice("BOT_ADDR::".length)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseDeliveryWindow(): { start: number; end: number } {
  const fallback = "08:00-18:00";
  const raw = process.env.BOT_DELIVERY_WINDOW || fallback;
  const match = raw.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
  if (!match) return { start: 8 * 60, end: 18 * 60 };
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  return { start, end };
}

function parseHHMM(value: string): number | null {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
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
             FROM entities WHERE id = $1 AND entity_type = 'PF'`,
      values: [payload.cliente_id],
    });

    if (!partner.rows.length || (partner.rows[0] as Record<string, unknown>).ativo === false) {
      res.status(404).json({ error: "Cliente nao encontrado" });
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

    await client.query("BEGIN");
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

    const { itens, consumosPorItem, totais } = await processarItensVenda({
      client,
      itens: itensInput,
      dataEmissao: null,
    });

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

    await client.query("COMMIT");
    res.status(201).json({
      id: pedidoId,
      status: "confirmado",
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
