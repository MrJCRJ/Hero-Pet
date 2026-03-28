import database from "infra/database";
import type { ApiReqLike, ApiResLike } from "@/server/api/v1/types";
import { getRedis } from "@/lib/redis";

const HEARTBEAT_KEY = "heropet-bot:heartbeat";
const HEARTBEAT_TTL_MS = 2 * 60 * 1000;

async function resolveStatusBot(): Promise<string> {
  const redis = getRedis();
  if (!redis) return "desconhecido";

  try {
    const heartbeat = await redis.get(HEARTBEAT_KEY);
    if (!heartbeat) return "desconectado";
    const age = Date.now() - Number(heartbeat);
    return age <= HEARTBEAT_TTL_MS ? "conectado" : "desconectado";
  } catch {
    return "desconhecido";
  }
}

export default async function handler(req: ApiReqLike, res: ApiResLike): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: `Method "${req.method}" not allowed` });
    return;
  }
  try {
    const [result, statusBot] = await Promise.all([
      database.query({
        text: `SELECT
                 COUNT(*) FILTER (WHERE p.data_emissao::date = CURRENT_DATE) AS pedidos_hoje,
                 COALESCE(SUM(CASE WHEN p.data_emissao::date = CURRENT_DATE THEN p.total_liquido END), 0) AS total_hoje,
                 COUNT(*) FILTER (WHERE p.status::text IN ('rascunho')) AS pedidos_em_andamento,
                 MAX(p.data_emissao) AS ultima_mensagem
               FROM pedidos p
               JOIN entities e ON e.id = p.partner_entity_id
               WHERE p.tipo = 'VENDA'
                 AND e.entity_type = 'PF'
                 AND COALESCE(e.tipo_cliente, 'pessoa_juridica') = 'pessoa_fisica'
                 AND COALESCE(p.observacao::text, '') LIKE '%"origem":"BOT_WHATSAPP"%'`,
        values: [],
      }),
      resolveStatusBot(),
    ]);

    const row = result.rows[0] as Record<string, unknown>;
    res.status(200).json({
      pedidos_hoje: Number(row.pedidos_hoje ?? 0),
      total_hoje: Number(row.total_hoje ?? 0),
      pedidos_em_andamento: Number(row.pedidos_em_andamento ?? 0),
      ultima_mensagem: row.ultima_mensagem ?? null,
      status_bot: statusBot,
    });
  } catch (error) {
    console.error("[bot/resumo] error", error);
    res.status(500).json({ error: "Internal error" });
  }
}
