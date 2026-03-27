import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }
  try {
    const latestMsg = await database.query({
      text: `SELECT MAX(data_emissao) AS ultima_data
             FROM pedidos
             WHERE tipo = 'VENDA'
               AND COALESCE(observacao::text, '') LIKE '%"origem":"BOT_WHATSAPP"%'
               AND partner_entity_id IN (
                 SELECT id
                 FROM entities
                 WHERE entity_type = 'PF'
                   AND COALESCE(tipo_cliente, 'pessoa_juridica') = 'pessoa_fisica'
               )`,
      values: [],
    });
    const last = latestMsg.rows[0] as Record<string, unknown>;
    res.status(200).json({
      bot_conectado: true,
      ultima_mensagem_em: last.ultima_data ?? null,
      service: "api-bot",
    });
  } catch (error) {
    console.error("[bot/status] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}

