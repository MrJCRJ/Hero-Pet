import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { getRedis } from "@/lib/redis";

const HEARTBEAT_KEY = "heropet-bot:heartbeat";
const HEARTBEAT_TTL_MS = 2 * 60 * 1000;

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

    let botConectado = true;
    let heartbeatSource: "redis" | "fallback" = "fallback";

    const redis = getRedis();
    if (redis) {
      try {
        const heartbeat = await redis.get(HEARTBEAT_KEY);
        heartbeatSource = "redis";
        if (!heartbeat) {
          botConectado = false;
        } else {
          const age = Date.now() - Number(heartbeat);
          botConectado = age <= HEARTBEAT_TTL_MS;
        }
      } catch {
        heartbeatSource = "fallback";
      }
    }

    res.status(200).json({
      bot_conectado: botConectado,
      heartbeat_source: heartbeatSource,
      ultima_mensagem_em: last.ultima_data ?? null,
      service: "api-bot",
    });
  } catch (error) {
    console.error("[bot/status] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}
