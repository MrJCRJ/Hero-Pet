import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { BotClienteQuerySchema, BotClienteSchema } from "@/server/api/bot/schemas";
import { sanitizeForBotLogs } from "@/server/api/bot/logging";

type BotEndereco = {
  id: number;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
};

function parseEnderecoObservacao(observacao: unknown, fallbackNumero: string, fallbackCep: string): BotEndereco[] {
  if (typeof observacao !== "string" || !observacao.startsWith("BOT_ADDR::")) {
    return [];
  }
  try {
    const parsed = JSON.parse(observacao.slice("BOT_ADDR::".length)) as Omit<BotEndereco, "id">;
    return [
      {
        id: 0,
        logradouro: parsed.logradouro ?? "",
        numero: parsed.numero ?? fallbackNumero ?? "",
        bairro: parsed.bairro ?? "",
        cidade: parsed.cidade ?? "",
        uf: parsed.uf ?? "",
        cep: parsed.cep ?? fallbackCep ?? "",
      },
    ];
  } catch {
    return [];
  }
}

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }

  try {
    const queryParsed =
      req.method === "GET"
        ? BotClienteQuerySchema.safeParse(req.query ?? {})
        : BotClienteSchema.safeParse(req.body ?? {});
    if (!queryParsed.success) {
      res.status(400).json({ error: queryParsed.error.issues[0]?.message ?? "Invalid payload" });
      return;
    }

    const telefone = queryParsed.data.telefone.trim();
    const nome =
      req.method === "POST"
        ? ((queryParsed.data as { nome?: string }).nome || "Cliente WhatsApp").trim()
        : "Cliente WhatsApp";
    const tipoCliente =
      req.method === "POST"
        ? ((queryParsed.data as { tipo?: "pessoa_fisica" | "pessoa_juridica" }).tipo ?? "pessoa_fisica")
        : "pessoa_fisica";
    console.info("[bot/clientes] payload", sanitizeForBotLogs({ telefone, nome, tipoCliente }));

    const existing = await database.query({
      text: `SELECT id, name, telefone, cep, numero, observacao
                    , COALESCE(tipo_cliente, 'pessoa_juridica') AS tipo_cliente
             FROM entities
             WHERE entity_type = 'PF' AND telefone = $1
             ORDER BY id DESC
             LIMIT 1`,
      values: [telefone],
    });

    if (existing.rows.length && req.method === "GET") {
      const row = existing.rows[0] as Record<string, unknown>;
      const enderecos = parseEnderecoObservacao(row.observacao, String(row.numero ?? ""), String(row.cep ?? "")).map((e) => ({
        ...e,
        id: Number(row.id),
      }));
      const pedidosResult = await database.query({
        text: `SELECT p.id,
                      p.data_emissao::date AS data,
                      pi.quantidade AS quantidade_kg,
                      pr.nome AS produto_nome
               FROM pedidos p
               JOIN pedido_itens pi ON pi.pedido_id = p.id
               JOIN produtos pr ON pr.id = pi.produto_id
               WHERE p.partner_entity_id = $1
               ORDER BY p.data_emissao DESC, p.id DESC, pi.id ASC`,
        values: [Number(row.id)],
      });
      const grouped = new Map<number, { data: string; itens: Array<{ produto_nome: string; quantidade_kg: number }> }>();
      for (const r of pedidosResult.rows as Array<Record<string, unknown>>) {
        const pedidoId = Number(r.id);
        if (!grouped.has(pedidoId)) {
          if (grouped.size >= 5) continue;
          grouped.set(pedidoId, {
            data: String(r.data ?? ""),
            itens: [],
          });
        }
        grouped.get(pedidoId)?.itens.push({
          produto_nome: String(r.produto_nome ?? ""),
          quantidade_kg: Number(r.quantidade_kg ?? 0),
        });
      }
      res.status(200).json({
        id: Number(row.id),
        nome: String(row.name ?? nome),
        telefone: String(row.telefone ?? telefone),
        tipo: String(row.tipo_cliente ?? "pessoa_juridica"),
        enderecos,
        ultimos_pedidos: [...grouped.values()],
      });
      return;
    }

    if (existing.rows.length && req.method === "POST") {
      const row = existing.rows[0] as Record<string, unknown>;
      const updated = await database.query({
        text: `UPDATE entities
               SET name = COALESCE(NULLIF($1, ''), name),
                   tipo_cliente = COALESCE($2, tipo_cliente),
                   updated_at = NOW()
               WHERE id = $3
               RETURNING id, name, telefone, cep, numero, observacao, tipo_cliente`,
        values: [nome, tipoCliente, Number(row.id)],
      });
      const u = updated.rows[0] as Record<string, unknown>;
      const enderecos = parseEnderecoObservacao(u.observacao, String(u.numero ?? ""), String(u.cep ?? "")).map((e) => ({
        ...e,
        id: Number(u.id),
      }));
      res.status(200).json({
        id: Number(u.id),
        nome: String(u.name ?? nome),
        telefone: String(u.telefone ?? telefone),
        tipo: String(u.tipo_cliente ?? tipoCliente),
        enderecos,
        ultimos_pedidos: [],
      });
      return;
    }

    if (req.method === "GET") {
      res.status(404).json({ error: "Cliente não encontrado" });
      return;
    }

    const created = await database.query({
      text: `INSERT INTO entities
             (name, entity_type, document_digits, document_status, document_pending, telefone, ativo, tipo_cliente, created_at, updated_at)
             VALUES ($1, 'PF', '', 'pending', true, $2, true, $3, NOW(), NOW())
             RETURNING id, name, telefone, tipo_cliente`,
      values: [nome, telefone, tipoCliente],
    });

    const row = created.rows[0] as Record<string, unknown>;
    res.status(201).json({
      id: Number(row.id),
      nome: String(row.name ?? nome),
      telefone: String(row.telefone ?? telefone),
      tipo: String(row.tipo_cliente ?? tipoCliente),
      enderecos: [],
      ultimos_pedidos: [],
    });
  } catch (error) {
    console.error("[bot/clientes] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}
